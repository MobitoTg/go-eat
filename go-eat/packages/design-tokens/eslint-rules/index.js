/**
 * eslint-plugin-goeat — the design-system rules that make Constitution VI mechanically enforceable.
 *
 * VI.1: "Raw hex literals in component code are a build failure. Primitives (Open Color) are
 * referenced ONLY by the semantic layer, never by a component."
 *
 * A review check would catch most violations most of the time. These rules catch all of them every
 * time, which matters here because a stray hex in a widget view is not merely inconsistent — it is
 * a value that would then have to be maintained in Swift AND in Kotlin, and that no contrast gate
 * would ever see.
 */

const HEX_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const PRIMITIVE_PATTERN = /\boc\.(gray|red|pink|grape|violet|indigo|blue|cyan|teal|green|lime|yellow|orange)\.[0-9]\b/;

/** rgb()/rgba()/hsl() are the same violation wearing a different hat. */
const FUNCTIONAL_COLOR_PATTERN = /\b(?:rgba?|hsla?)\s*\(/;

const noRawHex = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw color literals outside the primitives layer. All color must resolve to a semantic token (Constitution VI.1).',
    },
    schema: [],
    messages: {
      rawHex:
        'Raw color literal "{{value}}" is a build failure (Constitution VI.1). Use a semantic token from @go-eat/design-tokens — color must resolve through the semantic layer so the contrast gate can verify it.',
      functionalColor:
        'Functional color notation is a build failure (Constitution VI.1). Use a semantic token from @go-eat/design-tokens.',
    },
  },

  create(context) {
    function check(node, value) {
      if (typeof value !== 'string') return;

      if (HEX_PATTERN.test(value)) {
        context.report({ node, messageId: 'rawHex', data: { value } });
        return;
      }
      if (FUNCTIONAL_COLOR_PATTERN.test(value)) {
        context.report({ node, messageId: 'functionalColor' });
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

const noPrimitiveReference = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow components referencing Layer 1 primitives directly. Only the semantic layer may (Constitution VI.1, VI.3).',
    },
    schema: [],
    messages: {
      primitiveRef:
        'Direct primitive reference "{{value}}" is not allowed here (Constitution VI.3). Primitives carry no semantics — reference a semantic token like `color.text.primary` instead.',
      primitiveImport:
        'Importing the primitives layer is not allowed here (Constitution VI.3). Import semantic tokens from @go-eat/design-tokens/tokens instead.',
    },
  },

  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && PRIMITIVE_PATTERN.test(node.value)) {
          context.report({ node, messageId: 'primitiveRef', data: { value: node.value } });
        }
      },

      // Reaching for `PRIMITIVES` or `resolvePrimitive` is the same violation one level up: it
      // lets a component pick a raw value the semantic map never blessed.
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string') return;

        if (source.includes('design-tokens/src/primitives') || source.endsWith('/primitives')) {
          context.report({ node, messageId: 'primitiveImport' });
          return;
        }

        for (const specifier of node.specifiers) {
          const name = specifier.imported && specifier.imported.name;
          if (name === 'PRIMITIVES' || name === 'resolvePrimitive') {
            context.report({ node: specifier, messageId: 'primitiveImport' });
          }
        }
      },
    };
  },
};

module.exports = {
  rules: {
    'no-raw-hex': noRawHex,
    'no-primitive-reference': noPrimitiveReference,
  },
};
