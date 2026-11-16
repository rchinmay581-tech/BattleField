import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';
import type { MapId } from './types';

export interface MapCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isRamp?: boolean;
  rampDir?: '+x' | '-x' | '+z' | '-z';
}

export interface BuiltMap {
  group: THREE.Group;
  colliders: MapCollider[];
  raycastMeshes: THREE.Object3D[];
  spawnPoints: THREE.Vector3[];
  waypoints: THREE.Vector3[];
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  sunColor: number;
  sunPos: THREE.Vector3;
  hemiSky: number;
  hemiGround: number;
  dispose: () => void;
}

export function buildArenaMap(mapId: MapId, textures: ProceduralTextureSet): BuiltMap {
  const group = new THREE.Group();
  const colliders: MapCollider[] = [];
  const raycastMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const addBox = (
    x: number,
    y: number, // bottom Y!
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    collide = true,
    castShadow = true
  ) => {
    const geo = trackGeo(new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (collide) {
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y,
        maxY: y + h,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
      raycastMeshes.push(mesh);
    }
    return mesh;
  };

  const addRamp = (
    x: number,
    baseY: number,
    z: number,
    w: number,
    h: number,
    d: number,
    dir: '+x' | '-x' | '+z' | '-z',
    mat: THREE.Material
  ) => {
    // Build a wedge geometry centered on X/Z, bottom at baseY
    const shape = new THREE.Shape();
    const len = dir === '+x' || dir === '-x' ? w : d;
    const width = dir === '+x' || dir === '-x' ? d : w;

    shape.moveTo(-len / 2, 0);
    shape.lineTo(len / 2, 0);
    if (dir === '+x' || dir === '+z') {
      shape.lineTo(len / 2, h);
    } else {
      shape.lineTo(-len / 2, h);
    }
    shape.closePath();

    const geo = trackGeo(
      new THREE.ExtrudeGeometry(shape, {
        depth: width,
        bevelEnabled: false,
      })
    );
    geo.translate(0, 0, -width / 2);

    const mesh = new THREE.Mesh(geo, mat);
    if (dir === '+z' || dir === '-z') {
      mesh.rotation.y = -Math.PI / 2;
    }
    mesh.position.set(x, baseY, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    raycastMeshes.push(mesh);

    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: baseY,
      maxY: baseY + h,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      isRamp: true,
      rampDir: dir,
    });
  };

  if (mapId === 'burg') {
    // --- BURG COURTYARD ---
    const sandstoneWallMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.sandstoneWall,
        roughness: 0.85,
        metalness: 0.04,
      })
    );
    const sandstoneTrimMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa88659,
        roughness: 0.8,
        metalness: 0.05,
      })
    );
    const floorMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.sandstoneFloor,
        roughness: 0.9,
        metalness: 0.02,
      })
    );
    const crateMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.woodCrate,
        roughness: 0.78,
        metalness: 0.05,
      })
    );
    const desertGroundMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc9a97a,
        roughness: 0.95,
        metalness: 0.0,
      })
    );
    const mesaMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xb18356,
        roughness: 0.92,
        metalness: 0.02,
      })
    );
    const foliageMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x4b7447,
        roughness: 0.88,
        metalness: 0.0,
      })
    );

    // Outer desert terrain extending far beyond arena
    const outerGround = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(320, 320)), desertGroundMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.04;
    outerGround.receiveShadow = true;
    group.add(outerGround);

    // Playable courtyard floor (68x68)
    const arenaFloor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(68, 68)), floorMat);
    arenaFloor.rotation.x = -Math.PI / 2;
    arenaFloor.position.y = 0;
    arenaFloor.receiveShadow = true;
    group.add(arenaFloor);
    raycastMeshes.push(arenaFloor);

    // Outer courtyard boundary walls with open arch views / battlements
    const wallH = 5.5;
    addBox(0, 0, -34.5, 70, wallH, 1.5, sandstoneWallMat);
    addBox(0, 0, 34.5, 70, wallH, 1.5, sandstoneWallMat);
    addBox(-34.5, 0, 0, 1.5, wallH, 68, sandstoneWallMat);
    addBox(34.5, 0, 0, 1.5, wallH, 68, sandstoneWallMat);

    // Distant sandstone mesas & desert rock outcrops outside perimeter
    const mesaConfigs = [
      [-68, -62, 34, 18, 28],
      [72, -55, 38, 22, 30],
      [-74, 56, 30, 15, 36],
      [66, 68, 42, 24, 28],
      [0, -82, 52, 20, 22],
      [-86, 4, 24, 14, 44],
      [88, -6, 26, 16, 48],
    ];
    for (const [mx, mz, mw, mh, md] of mesaConfigs) {
      addBox(mx, -0.1, mz, mw, mh, md, mesaMat, false, false);
      addBox(mx + 4, mh - 0.1, mz - 2, mw * 0.65, mh * 0.55, md * 0.65, sandstoneTrimMat, false, false);
    }

    // Desert cacti/trees near perimeter outside walls
    const cactusPositions = [
      [-46, -24], [-48, 18], [46, -22], [50, 14], [-22, -46], [24, 48],
    ];
    for (const [cx, cz] of cactusPositions) {
      addBox(cx, 0, cz, 1.1, 4.5, 1.1, foliageMat, false, false);
      addBox(cx + 0.9, 2.2, cz, 1.2, 0.8, 0.8, foliageMat, false, false);
      addBox(cx + 1.3, 2.2, cz, 0.7, 1.6, 0.7, foliageMat, false, false);
    }

    // --- CENTRAL COURTYARD LANDMARK (Market Pillar & Fountain Ring) ---
    addBox(0, 0, 0, 4.4, 1.1, 4.4, sandstoneTrimMat);
    addBox(0, 1.1, 0, 2.2, 4.2, 2.2, sandstoneWallMat);
    addBox(0, 5.3, 0, 3.0, 0.6, 3.0, sandstoneTrimMat);

    // Crate steps near mid so agile players can slide-hop up onto mid cover
    addBox(-4.2, 0, -4.2, 2.0, 1.6, 2.0, crateMat);
    addBox(-4.2, 1.6, -4.2, 1.5, 1.2, 1.5, crateMat);
    addBox(4.4, 0, 4.4, 2.2, 1.8, 2.2, crateMat);

    // --- WEST SNIPER BALCONY & CATWALK (x = -24, running N-S) ---
    addBox(-24, 0, 0, 6.5, 3.4, 30, sandstoneWallMat);
    // Parapet cover blocks along balcony edge
    addBox(-21.2, 3.4, -10, 0.9, 1.2, 5.5, sandstoneTrimMat);
    addBox(-21.2, 3.4, 0, 0.9, 1.2, 5.5, sandstoneTrimMat);
    addBox(-21.2, 3.4, 10, 0.9, 1.2, 5.5, sandstoneTrimMat);
    // Ramps onto West Balcony (North & South ends)
    addRamp(-24, 0, -19, 6.5, 3.4, 8, '+z', sandstoneTrimMat);
    addRamp(-24, 0, 19, 6.5, 3.4, 8, '-z', sandstoneTrimMat);

    // --- EAST ALLEYWAY BUILDINGS & ARCHED COVER ---
    addBox(22, 0, -14, 8, 5.2, 10, sandstoneWallMat);
    addBox(22, 0, 14, 8, 5.2, 10, sandstoneWallMat);
    // Elevated bridge connecting East buildings (high ground!)
    addBox(22, 3.4, 0, 6, 0.8, 18, sandstoneTrimMat);
    addBox(19.4, 4.2, 0, 0.8, 1.0, 12, sandstoneTrimMat);
    // Ramp up to East bridge from mid-east
    addRamp(15, 0, 0, 8, 3.4, 5, '+x', sandstoneTrimMat);

    // --- NORTH & SOUTH MARKET STALLS & CRATE CLUSTERS ---
    // North courtyard cover
    addBox(-8, 0, -21, 7, 3.2, 3.2, sandstoneWallMat);
    addBox(8, 0, -22, 6, 2.6, 2.6, crateMat);
    addBox(11, 0, -19, 2.4, 1.6, 2.4, crateMat);
    addBox(-11, 0, -13, 2.4, 2.0, 2.4, crateMat);
    addBox(-11, 2.0, -13, 2.0, 1.6, 2.0, crateMat);

    // South courtyard cover
    addBox(8, 0, 21, 7, 3.2, 3.2, sandstoneWallMat);
    addBox(-8, 0, 22, 6, 2.6, 2.6, crateMat);
    addBox(-11, 0, 19, 2.4, 1.6, 2.4, crateMat);
    addBox(11, 0, 13, 2.4, 2.0, 2.4, crateMat);
    addBox(11, 2.0, 13, 2.0, 1.6, 2.0, crateMat);

    // Mid-lane tactical wooden crates
    addBox(-11, 0, 0, 2.6, 2.2, 4.2, crateMat);
    addBox(10, 0, -7, 2.6, 2.2, 2.6, crateMat);
    addBox(10, 0, 7, 2.6, 2.2, 2.6, crateMat);

    const spawnPoints = [
      new THREE.Vector3(-28, 0.1, -28),
      new THREE.Vector3(28, 0.1, 28),
      new THREE.Vector3(-28, 0.1, 28),
      new THREE.Vector3(28, 0.1, -28),
      new THREE.Vector3(0, 0.1, -28),
      new THREE.Vector3(0, 0.1, 28),
      new THREE.Vector3(-24, 3.6, 0),
      new THREE.Vector3(22, 4.3, 0),
    ];

    const waypoints = [
      new THREE.Vector3(0, 0.1, -11),
      new THREE.Vector3(0, 0.1, 11),
      new THREE.Vector3(-12, 0.1, -8),
      new THREE.Vector3(-12, 0.1, 8),
      new THREE.Vector3(10, 0.1, 0),
      new THREE.Vector3(-24, 3.6, -9),
      new THREE.Vector3(-24, 3.6, 9),
      new THREE.Vector3(22, 4.3, 0),
      new THREE.Vector3(-16, 0.1, -25),
      new THREE.Vector3(16, 0.1, 25),
      new THREE.Vector3(16, 0.1, -25),
      new THREE.Vector3(-16, 0.1, 25),
    ];

    return {
      group,
      colliders,
      raycastMeshes,
      spawnPoints,
      waypoints,
      skyColor: 0xd4e4f4,
      fogColor: 0xdccbb2,
      fogNear: 48,
      fogFar: 175,
      sunColor: 0xfff0d4,
      sunPos: new THREE.Vector3(38, 65, 28),
      hemiSky: 0x9ec8ff,
      hemiGround: 0x9b7953,
      dispose: () => {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
      },
    };
  } else {
    // --- CARGO YARD ---
    const asphaltMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.asphalt,
        roughness: 0.85,
        metalness: 0.08,
      })
    );
    const concreteMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.concretePlatform,
        roughness: 0.8,
        metalness: 0.08,
      })
    );
    const redMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.containerRed,
        roughness: 0.52,
        metalness: 0.45,
      })
    );
    const blueMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.containerBlue,
        roughness: 0.52,
        metalness: 0.45,
      })
    );
    const amberMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.containerAmber,
        roughness: 0.52,
        metalness: 0.45,
      })
    );
    const hazardMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.hazardTrim,
        roughness: 0.65,
        metalness: 0.15,
      })
    );
    const crateMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.woodCrate,
        roughness: 0.78,
        metalness: 0.05,
      })
    );
    const oceanMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1c5170,
        roughness: 0.25,
        metalness: 0.35,
      })
    );
    const steelCraneMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc2492a,
        roughness: 0.48,
        metalness: 0.65,
      })
    );

    // Coastal ocean water stretching to the horizon
    const ocean = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(340, 340)), oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.2;
    group.add(ocean);

    // Concrete harbor dock base
    addBox(0, -1.2, 0, 76, 1.2, 76, concreteMat, false, false);

    // Playable asphalt yard (70x70)
    const floor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(70, 70)), asphaltMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    group.add(floor);
    raycastMeshes.push(floor);

    // Perimeter harbor jersey barriers + outer stacked containers
    addBox(0, 0, -35.5, 72, 3.2, 1.4, concreteMat);
    addBox(0, 0, 35.5, 72, 3.2, 1.4, concreteMat);
    addBox(-35.5, 0, 0, 1.4, 3.2, 70, concreteMat);
    addBox(35.5, 0, 0, 1.4, 3.2, 70, concreteMat);

    // Distant port cranes outside dock for industrial silhouette
    for (const cx of [-55, 55]) {
      addBox(cx, -1.2, -52, 3, 28, 3, steelCraneMat, false, false);
      addBox(cx, -1.2, -38, 3, 28, 3, steelCraneMat, false, false);
      addBox(cx, 25, -45, 4, 2.5, 34, steelCraneMat, false, false);
      addBox(cx * 0.6, 0, -68, 12, 6, 4.5, blueMat, false, false);
    }

    // --- CENTRAL STEEL SKYBRIDGE ---
    addBox(0, 3.6, 0, 26, 0.7, 5.2, concreteMat);
    // Support pillars
    addBox(-11, 0, 0, 1.4, 3.6, 4.6, hazardMat);
    addBox(11, 0, 0, 1.4, 3.6, 4.6, hazardMat);
    // Bridge side rails
    addBox(0, 4.3, -2.3, 18, 0.9, 0.5, hazardMat);
    addBox(0, 4.3, 2.3, 18, 0.9, 0.5, hazardMat);
    // Ramps onto central skybridge (West and East sides)
    addRamp(-17.5, 0, 0, 9, 3.6, 5.2, '+x', hazardMat);
    addRamp(17.5, 0, 0, 9, 3.6, 5.2, '-x', hazardMat);

    // --- SHIPPING CONTAINERS (Authentic 3.2m height x 3.6m width x 9m length) ---
    // North-West cluster
    addBox(-17, 0, -18, 10, 3.3, 3.8, redMat);
    addBox(-17, 3.3, -18, 10, 3.3, 3.8, blueMat); // Double-stacked!
    addBox(-24, 0, -9, 3.8, 3.3, 10, amberMat);
    addBox(-9, 0, -24, 2.4, 1.8, 2.4, crateMat);

    // North-East cluster
    addBox(17, 0, -18, 10, 3.3, 3.8, blueMat);
    addBox(24, 0, -9, 3.8, 3.3, 10, redMat);
    addBox(24, 3.3, -9, 3.8, 3.3, 10, amberMat);

    // South-West cluster
    addBox(-17, 0, 18, 10, 3.3, 3.8, amberMat);
    addBox(-24, 0, 9, 3.8, 3.3, 10, blueMat);
    addBox(-24, 3.3, 9, 3.8, 3.3, 10, redMat);

    // South-East cluster
    addBox(17, 0, 18, 10, 3.3, 3.8, redMat);
    addBox(17, 3.3, 18, 10, 3.3, 3.8, amberMat);
    addBox(24, 0, 9, 3.8, 3.3, 10, blueMat);

    // Mid-court flanking cover crates & containers
    addBox(0, 0, -13, 8, 3.3, 3.6, amberMat);
    addBox(0, 0, 13, 8, 3.3, 3.6, blueMat);
    addBox(-7, 0, -7, 2.4, 2.0, 2.4, crateMat);
    addBox(7, 0, 7, 2.4, 2.0, 2.4, crateMat);
    addBox(-7, 0, 7, 2.4, 1.6, 2.4, crateMat);
    addBox(7, 0, -7, 2.4, 1.6, 2.4, crateMat);

    // Elevated container sniper platform on North & South edge with ramp
    addBox(0, 0, -27, 12, 2.8, 5, concreteMat);
    addRamp(-9.5, 0, -27, 7, 2.8, 5, '+x', hazardMat);
    addBox(0, 0, 27, 12, 2.8, 5, concreteMat);
    addRamp(9.5, 0, 27, 7, 2.8, 5, '-x', hazardMat);

    const spawnPoints = [
      new THREE.Vector3(-29, 0.1, -29),
      new THREE.Vector3(29, 0.1, 29),
      new THREE.Vector3(-29, 0.1, 29),
      new THREE.Vector3(29, 0.1, -29),
      new THREE.Vector3(0, 4.5, 0),
      new THREE.Vector3(0, 3.0, -27),
      new THREE.Vector3(0, 3.0, 27),
      new THREE.Vector3(-28, 0.1, 0),
    ];

    const waypoints = [
      new THREE.Vector3(0, 4.5, 0),
      new THREE.Vector3(-9, 4.5, 0),
      new THREE.Vector3(9, 4.5, 0),
      new THREE.Vector3(-12, 0.1, -10),
      new THREE.Vector3(12, 0.1, 10),
      new THREE.Vector3(-12, 0.1, 10),
      new THREE.Vector3(12, 0.1, -10),
      new THREE.Vector3(0, 0.1, -20),
      new THREE.Vector3(0, 0.1, 20),
      new THREE.Vector3(-28, 0.1, -24),
      new THREE.Vector3(28, 0.1, 24),
      new THREE.Vector3(0, 3.0, -27),
    ];

    return {
      group,
      colliders,
      raycastMeshes,
      spawnPoints,
      waypoints,
      skyColor: 0x9ec5e6,
      fogColor: 0xadc9df,
      fogNear: 52,
      fogFar: 185,
      sunColor: 0xfff5e4,
      sunPos: new THREE.Vector3(-42, 68, 32),
      hemiSky: 0xaad4ff,
      hemiGround: 0x455260,
      dispose: () => {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
      },
    };
  }
}
