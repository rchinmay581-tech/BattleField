import * as THREE from 'three';
import type { WeaponId } from './types';

export interface ViewModelRig {
  root: THREE.Group;
  muzzleTip: THREE.Object3D;
  muzzleFlash: THREE.Mesh;
  hipOffset: THREE.Vector3;
  adsOffset: THREE.Vector3;
}

export function createViewModel(weaponId: WeaponId): ViewModelRig {
  const root = new THREE.Group();

  const gunMetal = new THREE.MeshStandardMaterial({
    color: 0x242933,
    roughness: 0.32,
    metalness: 0.85,
  });
  const darkPolymer = new THREE.MeshStandardMaterial({
    color: 0x16191f,
    roughness: 0.78,
    metalness: 0.12,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8a5128,
    roughness: 0.72,
    metalness: 0.05,
  });
  const steelAccent = new THREE.MeshStandardMaterial({
    color: 0x7b8696,
    roughness: 0.24,
    metalness: 0.92,
  });
  const opticGlow = new THREE.MeshBasicMaterial({
    color: weaponId === 'hunter' ? 0x06b6d4 : 0xef4444,
  });

  const muzzleTip = new THREE.Object3D();

  if (weaponId === 'triggerman') {
    // AK-47 style rifle (7 parts)
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.44), gunMetal);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10), steelAccent);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.4);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.075, 0.24), woodMat);
    handguard.position.set(0, 0.005, -0.26);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.1, 0.24), woodMat);
    stock.position.set(0, -0.02, 0.3);
    stock.rotation.x = 0.08;

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.065), darkPolymer);
    grip.position.set(0, -0.1, 0.11);
    grip.rotation.x = 0.28;

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.2, 0.085), darkPolymer);
    mag.position.set(0, -0.14, -0.06);
    mag.rotation.x = -0.22;

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.045, 0.02), gunMetal);
    frontSight.position.set(0, 0.055, -0.56);

    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.03, 0.04), gunMetal);
    rearSight.position.set(0, 0.068, 0.08);

    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.007, 0.007), opticGlow);
    dot.position.set(0, 0.074, -0.56);

    muzzleTip.position.set(0, 0.02, -0.63);
    root.add(receiver, barrel, handguard, stock, grip, mag, frontSight, rearSight, dot, muzzleTip);
  } else if (weaponId === 'hunter') {
    // AWP Sniper Rifle (7 parts)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2c4b3c,
      roughness: 0.68,
      metalness: 0.18,
    });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.11, 0.56), bodyMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.62, 12), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.028, -0.56);

    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.044, 0.08), steelAccent);
    muzzleBrake.position.set(0, 0.028, -0.88);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.34, 12), gunMetal);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.11, -0.05);

    const scopeBell = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.1, 12), gunMetal);
    scopeBell.rotation.x = Math.PI / 2;
    scopeBell.position.set(0, 0.11, -0.24);

    const boltHandle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.02), steelAccent);
    boltHandle.position.set(0.055, 0.035, 0.08);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.1), darkPolymer);
    mag.position.set(0, -0.08, -0.05);

    muzzleTip.position.set(0, 0.028, -0.94);
    root.add(chassis, barrel, muzzleBrake, scopeTube, scopeBell, boltHandle, mag, muzzleTip);
  } else if (weaponId === 'runngun') {
    // Compact Tactical SMG (7 parts)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.12, 0.36), darkPolymer);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.34), gunMetal);
    upper.position.set(0, 0.07, -0.01);

    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 10), steelAccent);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.02, -0.25);

    const extMag = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.24, 0.052), gunMetal);
    extMag.position.set(0, -0.15, -0.09);
    extMag.rotation.x = 0.12;

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.12, 0.06), darkPolymer);
    grip.position.set(0, -0.09, 0.09);
    grip.rotation.x = 0.22;

    const holoFrame = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.045, 0.06), gunMetal);
    holoFrame.position.set(0, 0.115, -0.02);

    const holoDot = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), opticGlow);
    holoDot.position.set(0, 0.118, -0.02);

    muzzleTip.position.set(0, 0.02, -0.36);
    root.add(body, upper, shroud, extMag, grip, holoFrame, holoDot, muzzleTip);
  } else {
    // Vince Breacher Double-Barrel Shotgun (6 parts)
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.1, 0.28), gunMetal);
    const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.48, 10), steelAccent);
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.set(-0.023, 0.024, -0.36);

    const barrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.48, 10), steelAccent);
    barrelR.rotation.x = Math.PI / 2;
    barrelR.position.set(0.023, 0.024, -0.36);

    const forend = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.06, 0.24), woodMat);
    forend.position.set(0, -0.015, -0.26);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.22), woodMat);
    stock.position.set(0, -0.045, 0.2);
    stock.rotation.x = 0.25;

    const bead = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.014, 0.014), opticGlow);
    bead.position.set(0, 0.054, -0.58);

    muzzleTip.position.set(0, 0.024, -0.62);
    root.add(receiver, barrelL, barrelR, forend, stock, bead, muzzleTip);
  }

  // Muzzle flash star (hidden by default)
  const flashGeo = new THREE.OctahedronGeometry(0.09, 0);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.9,
  });
  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlash.position.copy(muzzleTip.position);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);

  const hipOffset = new THREE.Vector3(0.28, -0.25, -0.44);
  const adsOffset = new THREE.Vector3(
    0,
    weaponId === 'hunter' ? -0.14 : -0.135,
    weaponId === 'hunter' ? -0.32 : -0.38
  );

  root.position.copy(hipOffset);
  return { root, muzzleTip, muzzleFlash, hipOffset, adsOffset };
}

export interface BotRig {
  root: THREE.Group;
  headGroup: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  hitMeshes: THREE.Mesh[];
  muzzleWorldAnchor: THREE.Object3D;
}

export function createVoxelCharacter(
  botId: string,
  vestColorHex: number,
  weaponId: WeaponId
): BotRig {
  const root = new THREE.Group();
  const hitMeshes: THREE.Mesh[] = [];

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf1c27d,
    roughness: 0.72,
    metalness: 0.04,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x333b48,
    roughness: 0.8,
    metalness: 0.08,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestColorHex,
    roughness: 0.55,
    metalness: 0.22,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.85,
    metalness: 0.05,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x15171c,
    roughness: 0.65,
    metalness: 0.25,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x11151c,
    roughness: 0.15,
    metalness: 0.9,
  });
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x1f242c,
    roughness: 0.35,
    metalness: 0.82,
  });

  const tagMesh = (mesh: THREE.Mesh, hitZone: 'head' | 'body') => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.botId = botId;
    mesh.userData.hitZone = hitZone;
    hitMeshes.push(mesh);
  };

  // Legs (0 -> 0.72m)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.15, 0.72, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.58, 0.26), pantsMat);
  leftLeg.position.set(0, -0.29, 0);
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.3), bootMat);
  leftBoot.position.set(0, -0.64, 0.02);
  tagMesh(leftLeg, 'body');
  tagMesh(leftBoot, 'body');
  leftLegPivot.add(leftLeg, leftBoot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.15, 0.72, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.58, 0.26), pantsMat);
  rightLeg.position.set(0, -0.29, 0);
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.3), bootMat);
  rightBoot.position.set(0, -0.64, 0.02);
  tagMesh(rightLeg, 'body');
  tagMesh(rightBoot, 'body');
  rightLegPivot.add(rightLeg, rightBoot);

  // Torso (0.72 -> 1.44m)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.32), shirtMat);
  torso.position.set(0, 1.08, 0);
  tagMesh(torso, 'body');

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.52, 0.36), vestMat);
  vest.position.set(0, 1.12, 0);
  tagMesh(vest, 'body');

  // Head Group (1.44 -> 1.96m)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.46, 0);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
  head.position.set(0, 0.23, 0);
  tagMesh(head, 'head');

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.08), visorMat);
  visor.position.set(0, 0.26, 0.23);
  tagMesh(visor, 'head');

  // Distinct class headgear
  const hat = new THREE.Mesh(
    new THREE.BoxGeometry(0.49, 0.16, 0.49),
    weaponId === 'hunter' ? vestMat : bootMat
  );
  hat.position.set(0, 0.43, 0);
  tagMesh(hat, 'head');

  headGroup.add(head, visor, hat);

  // Arms & 3rd-person Weapon
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.38, 1.38, 0);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.18), shirtMat);
  leftArm.position.set(0, -0.22, 0.14);
  leftArm.rotation.x = -0.95;
  tagMesh(leftArm, 'body');
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.38, 1.38, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.18), shirtMat);
  rightArm.position.set(0, -0.22, 0.18);
  rightArm.rotation.x = -1.25;
  tagMesh(rightArm, 'body');

  // 3rd-person weapon held forward (+Z in local bot space)
  const gunLen = weaponId === 'hunter' ? 0.95 : weaponId === 'runngun' ? 0.48 : 0.68;
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, gunLen), gunMat);
  gunBody.position.set(-0.14, -0.24, 0.48);
  const muzzleWorldAnchor = new THREE.Object3D();
  muzzleWorldAnchor.position.set(-0.14, -0.22, 0.48 + gunLen * 0.52);

  rightArmPivot.add(rightArm, gunBody, muzzleWorldAnchor);

  root.add(leftLegPivot, rightLegPivot, torso, vest, headGroup, leftArmPivot, rightArmPivot);

  return {
    root,
    headGroup,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    hitMeshes,
    muzzleWorldAnchor,
  };
}
