const R = require('ramda');
const input = require('./ajena_puro');

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

console.dir(output, { depth: null });
