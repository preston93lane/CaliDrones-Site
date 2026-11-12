// Entry for the trimmed three.js bundle used by the site. Rebuild after adding an import:
//   npm i three esbuild
//   npx esbuild vendor/three.entry.js --bundle --minify --format=esm --outfile=vendor/three.custom.min.js
export {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, Points, LineSegments, Sprite,
  BufferGeometry, BufferAttribute, BoxGeometry, CylinderGeometry, SphereGeometry, CircleGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, LineBasicMaterial, PointsMaterial, SpriteMaterial,
  CanvasTexture, Vector3, Vector4, Matrix4, MathUtils, PMREMGenerator, DirectionalLight, HemisphereLight,
  AdditiveBlending, DoubleSide, SRGBColorSpace, ACESFilmicToneMapping, DynamicDrawUsage,
} from 'three';
export { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
