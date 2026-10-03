const NO_EXTENT = 0;

export function fakeBottom(element: Element, readBottom: () => number): void {
  element.getBoundingClientRect = () => {
    const bottom = readBottom();
    return {
      top: NO_EXTENT,
      left: NO_EXTENT,
      right: NO_EXTENT,
      bottom,
      width: NO_EXTENT,
      height: bottom,
      x: NO_EXTENT,
      y: NO_EXTENT,
      toJSON: () => ({})
    } as DOMRect;
  };
}
