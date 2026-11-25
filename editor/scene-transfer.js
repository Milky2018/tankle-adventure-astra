// Keep typed mesh and image data out of decimal JSON on the local editor connection.
const types = { Float32Array, Float64Array, Uint32Array, Uint16Array, Uint8Array, Uint8ClampedArray, Int32Array, Int16Array, Int8Array };

function attributes(project, visit) {
  for (const g of project.scene.geometries ?? []) {
    for (const a of Object.values(g.data?.attributes ?? {})) visit(a, "array");
    if (g.data?.index) visit(g.data.index, "array");
  }
  for (const image of project.scene.images ?? [])
    if (image.url?.data) visit(image.url, "data");
  function walk(node) {
    if (node.instanceMatrix) visit(node.instanceMatrix, "array");
    if (node.instanceColor) visit(node.instanceColor, "array");
    for (const child of node.children ?? []) walk(child);
  }
  walk(project.scene.object);
}

export function packSceneTransfer(project) {
  attributes(project, (attr, key) => {
    const data = attr[key];
    if (!Object.hasOwn(types, attr.type) || !Array.isArray(data) || data.length < 256) return;
    const bytes = new Uint8Array(new types[attr.type](data).buffer);
    if (bytes.toBase64) attr[key] = bytes.toBase64();
    else {
      const chunks = [];
      for (let i = 0; i < bytes.length; i += 24576)
        chunks.push(btoa(String.fromCharCode(...bytes.subarray(i, i + 24576))));
      attr[key] = chunks.join("");
    }
  });
  return project;
}

export function unpackSceneTransfer(project) {
  attributes(project, (attr, key) => {
    if (typeof attr[key] !== "string") return;
    if (!Object.hasOwn(types, attr.type)) throw new Error("Unknown scene attribute type " + attr.type);
    const bytes = Uint8Array.fromBase64 ? Uint8Array.fromBase64(attr[key]) :
      Uint8Array.from(atob(attr[key]), c => c.charCodeAt(0));
    attr[key] = Array.from(new types[attr.type](bytes.buffer, bytes.byteOffset, bytes.byteLength / types[attr.type].BYTES_PER_ELEMENT));
  });
  return project;
}
