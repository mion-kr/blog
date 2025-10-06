export default function remarkMermaid() {
  return function transform(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node.children)) {
      node.children = node.children.map((child) => {
        if (!child || typeof child !== 'object') {
          return child;
        }

        if (
          child.type === 'code' &&
          typeof child.lang === 'string' &&
          child.lang.toLowerCase() === 'mermaid'
        ) {
          return {
            type: 'mdxJsxFlowElement',
            name: 'MermaidChart',
            attributes: [],
            children: [
              {
                type: 'text',
                value: child.value || '',
              },
            ],
          };
        }

        transform(child);
        return child;
      });
    }
  };
}
