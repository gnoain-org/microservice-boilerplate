const _ = require('lodash');
const R = require('ramda');

var transformProduct = product => {
  let input = product;
  const renameKeys = R.curry((keysMap, obj) =>
    R.reduce(
      (acc, key) => R.assoc(R.propOr(key, key, keysMap), obj[key], acc),
      {},
      R.keys(obj)
    )
  );

  const transformAttribute = attribute => {
    return R.pipe(
      R.pathOr([], ['values', 'values']),
      R.ifElse(
        R.all(R.has('value')),
        R.map(
          renameKeys({
            value: 'text'
          })
        ),
        R.chain(transformAttribute)
      )
    )(attribute);
  };

  const generateLinks = R.curry((resource, resourceKey) => {
    const imageSizes = ['big', 'medium', 'small', 'zoom'];
    const gifTypes = [
      'promo_gifs',
      'our_best_price',
      'special_series',
      'internet_exclusive',
      'eci_exclusive',
      'seen_on_tv'
    ];
    return R.pipe(
      R.cond([
        [
          // URL string
          R.is(String),
          R.applySpec({
            type: R.always(resourceKey),
            links: [
              {
                url: R.identity
              }
            ]
          })
        ],
        [
          // Images with sizes
          R.pipe(R.keys, R.intersection(imageSizes), R.length),
          R.applySpec({
            name: R.always(resourceKey),
            type: R.always('image'),
            links: R.pipe(
              R.pick(imageSizes),
              R.mapObjIndexed(
                R.useWith(R.merge, [R.identity, R.objOf('size')])
              ),
              R.values
            )
          })
        ],
        [
          // Media
          R.has('type'),
          R.applySpec({
            type: R.prop('type'),
            links: R.pipe(R.pick(['title', 'url']), R.of)
          })
        ],
        [
          // Gifs
          R.pipe(R.keys, R.intersection(gifTypes), R.length),
          R.applySpec({
            type: R.always('gif'),
            name: R.pipe(R.keys, R.head),
            links: [
              {
                url: R.pipe(R.values, R.head)
              }
            ]
          })
        ],
        [
          // Links with title and url
          R.T,
          R.applySpec({
            type: R.always(resourceKey),
            links: R.of
          })
        ]
      ])
    )(resource);
  });

  /*
    Merge unchanged top-level properties
  */
  let output = R.merge(
    {},
    R.pick(
      [
        'category_id',
        'category_hierarchy',
        'group_type',
        'id',
        'product_type',
        'short_description',
        'store_id',
        'title',
        'mandatory_info'
      ],
      input
    )
  );

  // Cross Selling
  output.cross_selling = R.pipe(
    R.propOr([], ['cross_selling']),
    R.map(transformProduct)
  )(input);

  // Collection Skus
  output.collection_skus = R.pipe(
    R.propOr([], ['collection_skus']),
    R.map(R.applySpec({ id: R.propOr('', 'product'), skus: R.of })),
    R.map(transformProduct)
  )(input);

  // Parent Collection
  output.parent_collection = R.pipe(
    R.propOr([], ['parent_collection']),
    R.map(transformProduct)
  )(input);

  // Range
  output.range = R.pipe(
    R.pathOr([], ['range', 'products']),
    R.map(transformProduct),
    R.assoc('products', input.range)
  )(input);

  // Brand
  output.brand = renameKeys(
    {
      value: 'id'
    },
    input.brand
  );

  // Descriptions
  output.descriptions = input.description;

  // Default provider
  output.default_provider = R.propOr(null, 'provider', input);

  // Default variant
  output.default_variant = R.pipe(
    R.find(
      R.propSatisfies(R.curry(_.isMatch)(input.priority_image), 'image_link')
    ),
    R.propOr(null, 'sku')
  )(input.skus);

  // Attribute groups

  // Attribute Groups :: Original
  output.attribute_groups = R.pipe(
    R.propOr([], 'attribute_groups'),
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
      {
        currentGroup: null,
        groups: {}
      }
    ),
    R.prop('groups'),
    R.values,
    R.map(group => {
      group.attributes = R.map(attribute => {
        attribute.values = transformAttribute(attribute);
        return attribute;
      }, R.propOr([], 'attributes', group));
      return group;
    })
  )(input);

  // Attribute Groups :: Custom
  const attributesConfig = [
    ['food_attributes', [['food_sale_info'], ['food_information']]],
    [
      'related_products',
      [['collection_skus'], ['range'], ['cross_selling'], ['parent_collection']]
    ],
    ['payment_options', [['financed_info']]],
    [
      'product_info',
      [
        ['title'],
        ['description'],
        ['short_description'],
        ['product_type'],
        ['pack_composition']
      ]
    ],
    [
      'variants_info',
      [
        ['authors'],
        ['artists'],
        ['directors'],
        ['actors'],
        ['year'],
        ['variants']
      ]
    ]
  ];

  const createAttributeGroupFromProps = (name, attributesPaths, origin) => {
    let group = {
      group: name,
      attributes: R.map(
        R.applySpec({
          name: R.last,
          values: R.pipe(R.path(R.__, origin), R.of)
        }),
        attributesPaths
      )
    };
    group.attributes = R.filter(
      R.pipe(R.prop('values'), R.head, R.isNil, R.not),
      group.attributes
    );

    return R.isEmpty(group.attributes) ? undefined : group;
  };

  output.attribute_groups = R.filter(
    R.complement(R.isNil),
    R.concat(
      output.attribute_groups,
      R.map(
        R.apply(R.partialRight(createAttributeGroupFromProps, [input])),
        attributesConfig
      )
    )
  );

  // Promotions
  const processPromotion = R.pipe(
    // Build Links
    promotion => {
      return R.pipe(
        R.pick(['condition_link', 'url', 'promo_link']),
        R.mapObjIndexed(generateLinks),
        R.values,
        R.assoc('links', R.__, promotion),
        R.omit(['condition_link', 'url', 'promo_link'])
      )(promotion);
    },
    // Build Media
    promotion => {
      return R.pipe(
        R.pick(['image_url', 'image', 'image_links']),
        R.mapObjIndexed(generateLinks),
        R.values,
        R.assoc('media', R.__, promotion),
        R.omit(['image_url', 'image', 'image_links'])
      )(promotion);
    },
    // Adapt products
    promotion => {
      promotion.products = R.when(
        R.complement(R.isNil),
        R.map(transformProduct)
      )(promotion.products);
      return promotion;
    }
  );

  const buildPromotions = R.pipe(
    R.pick([
      'promos',
      'informativa_promotions',
      'coste_promotions',
      'gift_promotions'
    ]),
    R.values,
    R.flatten,
    R.map(processPromotion),
    R.map(R.reject(R.isEmpty))
  );
  output.promotions = buildPromotions(input);

  // Signal Services
  output.services = R.map(
    R.evolve({ installation: processPromotion }),
    R.propOr([], 'signal_services', input)
  );

  // Variants
  // Variants :: Media
  const buildMedia = skuObject => {
    return R.pipe(
      R.pick([
        'image_link',
        'image',
        'additional_image_links',
        'look_image_links',
        'multimedia_external_links',
        'media',
        'gifs'
      ]),
      R.mapObjIndexed((media, mediaKey) => {
        return R.pipe(R.of, R.unnest, R.map(generateLinks(R.__, mediaKey)))(
          media
        );
      }),
      R.values,
      R.flatten
    )(skuObject);
  };

  // Variants :: Variant Keys
  const variantKeysTransformation = {
    color: R.pipe(
      R.pick(['color', 'image_color']),
      renameKeys({
        image_color: 'image',
        color: 'value'
      })
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
    format: R.prop('format')
  };

  const transformSku = skuObject => {
    let variant = R.pick(
      [
        'sku',
        'gtin',
        'internal_id',
        'ean_provider',
        'merchandising',
        'web_model_code',
        'mandatory_info',
        'units',
        'marketplace_info'
      ],
      skuObject
    );

    variant.cross_selling = R.pipe(
      R.propOr([], ['cross_selling']),
      R.map(transformProduct)
    )(skuObject);

    variant.attributes = R.pipe(
      R.propOr([], 'house_hold'),
      R.map(transformAttribute)
    )(skuObject);
    R.pipe(
      R.pick(['isbn_old', 'book_binding']),
      R.mapObjIndexed((value, key) => {
        return {
          name: key,
          values: [
            {
              value
            }
          ]
        };
      }),
      R.values,
      R.concat(variant.attributes)
    )(skuObject);

    variant.promotions = buildPromotions(skuObject);

    variant.media = buildMedia(skuObject);

    variant.bundle = {
      code: skuObject.bundle_code,
      components: skuObject.bundle_components
    };

    variant.services = R.propOr([], skuObject.signal_services);
    R.map(
      R.pipe(
        R.propOr([], 'installation')
        // TODO adapt products
      ),
      variant.services
    );

    variant.services = R.map(
      R.evolve({ installation: processPromotion }),
      R.propOr([], 'signal_services', skuObject)
    );

    variant.variant_keys = R.map(
      variantKey =>
        R.merge(
          {
            key: variantKey
          },
          variantKeysTransformation[variantKey](skuObject)
        ),
      R.pipe(R.pick(R.keys(variantKeysTransformation)), R.keys)(skuObject)
    );

    variant.other_providers_treatment = R.cond([
      [
        R.both(
          R.propEq('marketplace_type_reference', '02'),
          R.propOr(false, 'marketplace_show_offers')
        ),
        R.always('show_always')
      ],
      [
        R.both(
          R.propEq('marketplace_type_reference', '02'),
          R.propOr(true, 'marketplace_show_offers')
        ),
        R.always('hide_if_eci')
      ],
      [R.T, R.always('transparent')]
    ])(input);

    return R.reject(R.isEmpty, variant);
  };

  output.variants = input.skus.map(transformSku);

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
    R.map(
      renameKeys({
        provider_id: 'id'
      })
    ),
    R.map(
      R.evolve({
        id: R.when(R.is(Number), R.toString)
      })
    )
  )(input);

  // Offers

  // Offers :: Shipping Options
  const validShippingOptions = R.pipe(
    R.converge(R.concat, [
      R.propOr([], 'sts_companies'),
      R.ifElse(
        R.has('home_delivery'),
        R.always([
          {
            id: '000'
          }
        ]),
        R.always([])
      )
    ]),
    R.pluck('id')
  );
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
              validShippingOptions(R.propOr({}, 'badges', sku))
            )
          ),
          R.when(
            R.always(R.prop('available_centre', sku.badges)),
            R.append({
              name: 'eci_pickup'
            })
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
        R.map(
          R.evolve({
            prices: R.map(R.omit(['express_checkout']))
          })
        )
      )
    )(offer);
  };

  // Offers :: Availability
  const availabilityBadges = [
    'availability_date',
    'launching_date',
    'coming_soon',
    'last_units',
    'new'
  ];

  output.offers = R.chain(skuObject => {
    return R.pipe(
      R.converge(R.concat, [R.propOr([], 'providers'), R.of]),
      R.map(provider => R.merge(provider, provider.offer)),
      R.map(providedSku => {
        let offer = {};
        offer.provider = R.propOr(
          output.default_provider,
          'provider_id',
          providedSku
        );
        offer.id = R.propOr(
          `internal_${offer.provider}_${skuObject.sku}`,
          'offer_id',
          providedSku
        );
        offer.variant = R.prop('sku', skuObject);

        // Offer :: Pricing
        offer.pricing = R.pick(
          [
            'price',
            'sale_price',
            'discount',
            'promotional_price',
            'unit_price'
          ],
          providedSku
        );

        // Offer :: Shipping Options
        offer.shipping_options = getShippingOptionsForOffer(
          providedSku,
          skuObject
        );

        // Offer :: Availability
        offer.availability = R.merge(
          {
            status: R.ifElse(R.equals('ADD'), R.always('available'), R.toLower)(
              skuObject.add_to_cart
            ),
            form: skuObject.form_name,
            edition_date: skuObject.edition_date,
            unpublished_date: skuObject.unpublished_date,
            with_stock: providedSku.delivery_time_with_stock,
            without_stock: providedSku.delivery_time_without_stock,
            without_stock_date: skuObject.without_basket_date
          },
          R.pick(availabilityBadges, R.propOr({}, 'badges', skuObject))
        );
        return offer;
      })
    )(skuObject);
  }, input.skus);

  return output;
};

module.exports = transformProduct;
