const R = require('ramda');

const adaptProduct = ctx => {
  let input = ctx.response.body;

  //const input = require('./mixto');

  const renameKeys = R.curry((keysMap, obj) =>
    R.reduce(
      (acc, key) => R.assoc(R.propOr(key, key, keysMap), obj[key], acc),
      {},
      R.keys(obj)
    )
  );

  /*
  Merge unchanged top-level properties
*/
  let output = R.merge(
    {},
    R.pick(
      [
        'id',
        'title',
        'category_id',
        'category_hierarchy',
        'store_id',
        'product_type',
        'group_type'
      ],
      input
    )
  );

  // Brand
  output.brand = renameKeys({ value: 'id' }, input.brand);

  // Descriptions
  output.descriptions = input.description;

  // Default provider
  output.default_provider = R.propOr(null, 'provider', input);

  // Default variant
  output.default_variant = R.pipe(
    R.find(R.pipe(R.prop('image_link'), R.equals(input.priority_image))),
    R.propOr(null, 'sku')
  )(input.skus);

  // Attribute groups

  output.attribute_groups = R.pipe(
    R.reduce(
      (acc, attribute_group) => {
        acc.currentGroup = R.propOr(
          R.propOr('others', 'currentGroup', acc),
          'group',
          attribute_group
        );
        if (acc.currentGroup !== 'others') {
          acc = R.assocPath(
            ['groups', acc.currentGroup, 'group'],
            acc.currentGroup,
            acc
          );
        }
        acc = R.assocPath(
          ['groups', acc.currentGroup, 'attributes'],
          R.concat(
            R.propOr([], 'attributes', attribute_group),
            R.pathOr([], ['groups', acc.currentGroup, 'attributes'], acc)
          ),
          acc
        );
        return acc;
      },
      { currentGroup: null, groups: {} }
    ),
    R.prop('groups'),
    R.values,
    R.map(group => {
      group.attributes = R.map(attribute => {
        const flattenValues = function(values) {
          return R.ifElse(
            R.all(R.has('value')),
            R.map(renameKeys({ value: 'text' })),
            R.pipe(
              R.map(R.pathOr([], ['values', 'values'])),
              R.chain(flattenValues)
            )
          )(values);
        };
        attribute.values = flattenValues(
          R.pathOr([], ['values', 'values'], attribute)
        );
        return attribute;
      }, R.propOr([], 'attributes', group));
      return group;
    })
  )(input.attribute_groups);

  // Variants
  const mediaResourcesMap = {
    image_link: {
      name: 'main_image',
      type: 'image',
      keyName: 'size'
    }
  };

  let buildMedia = sku => {
    return R.pipe(
      Object.keys,
      R.filter(R.contains(R.__, Object.keys(mediaResourcesMap))),
      R.map(mediaKey =>
        R.merge(R.pick(['name', 'type'], mediaResourcesMap[mediaKey]), {
          links: R.map(
            mediaPropertyKey =>
              R.merge(sku[mediaKey][mediaPropertyKey], {
                [mediaResourcesMap[mediaKey].keyName]: mediaPropertyKey
              }),
            Object.keys(sku[mediaKey])
          )
        })
      )
    )(sku);
  };

  const variantKeysTransformation = {
    color: R.pipe(
      R.pick(['color', 'image_color']),
      renameKeys({ image_color: 'image' })
    ),
    sizes: sku =>
      R.filter(R.identity, {
        title: R.path(['sizes', 0, 'title'], sku.sizes),
        sizes: R.chain(
          size =>
            R.addIndex(R.map)(
              (sizeValue, index) =>
                R.filter(R.identity, {
                  size: sizeValue,
                  format: R.path(['description', index], sku.sizes)
                }),
              size.sizes
            ),
          sku.sizes.sizes
        )
      }),
    edition_date: R.prop('edition_date')
  };

  output.variants = input.skus.map(skuObject => {
    let variant = R.pick(['sku', 'gtin'], skuObject);
    variant.media = buildMedia(skuObject);
    variant.variant_keys = R.map(
      vKey => ({
        key: vKey,
        value: variantKeysTransformation[vKey](skuObject)
      }),
      R.filter(
        R.contains(R.__, Object.keys(variantKeysTransformation)),
        Object.keys(skuObject)
      )
    );

    let treatmentMap = [
      {
        applies:
          input.marketplace_type_reference === '02' &&
          input.marketplace_show_offers,
        result: 'show_always'
      },
      {
        applies:
          input.marketplace_type_reference === '02' &&
          !input.marketplace_show_offers,
        result: 'hide_if_eci'
      },
      { applies: true, result: 'transparent' }
    ];
    variant.other_providers_treatment = R.find(
      R.prop('applies'),
      treatmentMap
    ).result;

    return variant;
  });

  // Providers

  const providersMap = {
    '00000000': {
      id: '00000000',
      name: 'El Corte Inglés'
    },
    BRI00019: {
      id: 'BRI00019',
      name: 'Bricor'
    }
  };

  output.providers = R.pipe(
    input =>
      R.concat(
        [providersMap[input.provider]],
        R.propOr([], 'marketplace_providers_details', input)
      ),
    R.filter(R.identity),
    R.map(renameKeys({ provider_id: 'id' })),
    R.map(R.evolve({ id: R.toString }))
  )(input);

  // Offers
  const availabilityMap = {
    ADD: 'available'
  };

  const validShippingOptions = badges => {
    return R.pipe(
      R.propOr([], 'sts_companies'),
      R.map(R.prop('id')),
      R.when(R.always(R.prop('home_delivery', badges)), R.append('000'))
    )(badges);
  };

  const shippingOptionsByOfferId = R.pipe(
    R.of,
    R.concat(
      R.pipe(
        R.pathOr({}, [
          'marketplace_shippings',
          'marketplace_shipping_providers'
        ]),
        R.chain(R.propOr([], 'providers'))
      )(input.shipping)
    ),
    R.reduce(
      (acc, value) =>
        R.assoc(
          R.pathOr('eci', ['offer', 'offer_id'], value),
          R.map(
            shippingOption => ({
              id: shippingOption.id,
              name: R.pipe(R.prop('title'), R.toLower)(shippingOption),
              prices: R.pipe(
                R.prop('locations'),
                R.reject(R.propEq('shipping', '-')),
                R.map(location =>
                  R.merge(
                    R.pick(['title', 'priority', 'express_checkout'], location),
                    {
                      shipping_price: R.pipe(
                        R.match(/\d+(,\d{2})?/),
                        R.head,
                        R.replace(',', '.'),
                        parseFloat
                      )(location.shipping)
                    }
                  )
                )
              )(shippingOption)
            }),
            R.propOr([], 'available', value)
          ),
          acc
        ),
      {}
    )
  )(input.shipping);

  const getShippingOptionsForOffer = (offer, sku) => {
    return R.pipe(
      R.ifElse(
        R.prop('offer_id'),
        R.always(shippingOptionsByOfferId[offer.offer_id]),
        R.pipe(
          R.always(shippingOptionsByOfferId.eci),
          R.filter(eciShippingOption =>
            R.contains(
              R.prop('id', eciShippingOption),
              validShippingOptions(sku.badges)
            )
          ),
          R.when(
            R.always(R.prop('available_centre', sku.badges)),
            R.append({ name: 'eci_pickup' })
          ),
          R.when(
            R.find(R.propEq('id', '000')),
            R.pipe(
              shippingOptions =>
                R.append({
                  name: 'express',
                  prices: R.filter(
                    R.prop('express_checkout'),
                    R.propOr(
                      [],
                      'prices',
                      R.find(R.propEq('id', '000'), shippingOptions)
                    )
                  )
                })(shippingOptions),
              R.map(
                R.when(
                  R.propEq('id', '000'),
                  R.evolve({
                    prices: R.reject(R.prop('express_checkout'))
                  })
                )
              )
            )
          )
        )
      ),
      R.pipe(
        R.filter(R.path(['prices', 'length'])),
        R.map(R.evolve({ prices: R.map(R.omit(['express_checkout'])) }))
      )
    )(offer);

    // if (offer.offer_id) {
    //   shippingOptions = shippingOptionsByOfferId[offer.offer_id];
    // } else {
    //   shippingOptions = R.pipe(
    //     R.filter(eciShippingOption =>
    //       R.contains(
    //         R.prop('id', eciShippingOption),
    //         validShippingOptions(sku.badges)
    //       )
    //     ),
    //     R.when(
    //       R.always(R.prop('available_centre', sku.badges)),
    //       R.append({ name: 'eci_pickup' })
    //     ),
    //     R.when(
    //       R.find(R.propEq('id', '000')),
    //       R.pipe(
    //         shippingOptions =>
    //           R.append({
    //             name: 'express',
    //             prices: R.filter(
    //               R.prop('express_checkout'),
    //               R.propOr(
    //                 [],
    //                 'prices',
    //                 R.find(R.propEq('id', '000'), shippingOptions)
    //               )
    //             )
    //           })(shippingOptions),
    //         R.map(
    //           R.when(
    //             R.propEq('id', '000'),
    //             R.evolve({
    //               prices: R.reject(R.prop('express_checkout'))
    //             })
    //           )
    //         )
    //       )
    //     )
    //   )(shippingOptionsByOfferId.eci);
    // }

    // shippingOptions = R.pipe(
    //   R.filter(R.path(['prices', 'length'])),
    //   R.map(R.evolve({ prices: R.map(R.omit(['express_checkout'])) }))
    // )(shippingOptions);

    // return shippingOptions;
  };

  output.offers = R.chain(skuObject => {
    let variant = { sku: skuObject.sku };

    return R.pipe(
      R.map(provider => R.merge(provider, provider.offer)),
      R.map(provider => ({
        offer_id: R.prop('offer_id', provider),
        provider_id: R.propOr(output.default_provider, 'provider_id', provider),
        variant: variant,
        pricing: R.pick(['price', 'sale_price', 'discount'], provider),
        availability: {
          status: availabilityMap[skuObject.add_to_cart],
          with_stock: provider.delivery_time_with_stock,
          without_stock: provider.delivery_time_with_stock
        }
      })),
      R.map(offer => {
        return R.merge(offer, {
          shipping_options: getShippingOptionsForOffer(offer, skuObject)
        });
      }),
      R.map(R.filter(R.identity)),
      R.filter(R.prop('provider_id'))
    )(R.concat(R.propOr([], 'providers', skuObject), [skuObject]));
  }, input.skus);

  //console.dir(output, { depth: null });

  ctx.response.body = output;
};

module.exports = adaptProduct;
