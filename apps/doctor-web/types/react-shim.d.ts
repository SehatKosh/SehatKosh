import "react";

// Augment React 18 ReactNode to accept bigint to resolve cross-package type compatibility
// with dependencies compiled against React 19 / newer @types/react in monorepo workspaces.
declare module "react" {
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES {
    bigint: bigint;
  }
}

declare global {
  namespace React {
    interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES {
      bigint: bigint;
    }
  }
}
