/*
 * Illustrative cool contemporary finishes, independent from DWG geometry.
 * PBR images are local CC0 assets. See assets/textures/credits.json for sources.
 * All UVs are in metres; texture repeats below are inverse physical tile sizes.
 */
export async function createMaterials(THREE, renderer) {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const files = {
    oak: ['laminate_floor_02_diff_1k.jpg', 'laminate_floor_02_nor_gl_1k.jpg', 'laminate_floor_02_rough_1k.jpg'],
    veneer: ['white_oak_veneer_diff_1k.jpg', 'white_oak_veneer_nor_gl_1k.jpg', 'white_oak_veneer_rough_1k.jpg'],
    wool: ['poly_wool_herringbone_diff_1k.jpg', 'poly_wool_herringbone_nor_gl_1k.jpg', 'poly_wool_herringbone_rough_1k.jpg'],
    plaster: ['white_plaster_02_diff_1k.jpg', 'white_plaster_02_nor_gl_1k.jpg', 'white_plaster_02_rough_1k.jpg'],
    tile: ['granite_tile_diff_1k.jpg', 'granite_tile_nor_gl_1k.jpg', 'granite_tile_rough_1k.jpg'],
    stone: ['Marble012_1K-JPG_Color.jpg', 'Marble012_1K-JPG_NormalGL.jpg', 'Marble012_1K-JPG_Roughness.jpg'],
  };
  const loaded = {};
  await Promise.all(Object.entries(files).map(async ([key, names]) => {
    loaded[key] = await Promise.all(names.map(async (name, index) => {
      const path = `./assets/textures/${name}`;
      // The downloadable single-file walkthrough embeds the same maps as data URLs.
      const source = globalThis.WALKTHROUGH_TEXTURES?.[path] || path;
      const texture = await loader.loadAsync(source);
      texture.name = name;
      texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = anisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    }));
  }));
  function maps(key, width, height = width, rotation = 0) {
    const [map, normalMap, roughnessMap] = loaded[key].map(base => {
      const tex = base.clone();
      tex.repeat.set(1 / width, 1 / height);
      tex.rotation = rotation;
      tex.needsUpdate = true;
      return tex;
    });
    return {map, normalMap, roughnessMap};
  }
  const physical = (name, params) => {
    const material = new THREE.MeshPhysicalMaterial(params);
    material.name = name;
    material.userData.finishAssumption = true;
    return material;
  };
  // Real scan albedo is graded to the approved palette before lighting, never
  // made emissive. Normal and roughness maps retain the original surface detail.
  function grade(material, saturation, gain = 1, lift = 0) {
    const signature = [saturation, gain, lift].map(v => Number(v).toFixed(4));
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        #ifdef USE_MAP
          float finishLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = clamp(mix(vec3(finishLuminance), diffuseColor.rgb, ${signature[0]}) * ${signature[1]} + vec3(${signature[2]}), vec3(0.0), vec3(0.92));
        #endif
      `);
    };
    material.customProgramCacheKey = () => `finish-grade-${signature.join('-')}`;
    material.userData.albedoGrade = {saturation, gain, lift};
    return material;
  }
  const normal = value => new THREE.Vector2(value, value);
  const M = {
    floorWood: grade(physical('Pale oak · satin finish · 210 mm boards', {
      ...maps('oak', 1.7), color: 0xeef2f4, roughness: .88,
      normalScale: normal(.28), clearcoat: .12, clearcoatRoughness: .4,
      envMapIntensity: .7,
    }), .55, 1.08, .035),
    floorTile: grade(physical('Grey honed stone tiles · 460 mm', {
      ...maps('tile', 2.3), color: 0xf2f4f5, roughness: .8,
      normalScale: normal(.27), clearcoat: .06, clearcoatRoughness: .5,
    }), .25, 1.5, .10),
    plaster: grade(physical('Soft white painted plaster', {
      ...maps('plaster', 1), color: 0xf3f4f2, roughness: .96,
      normalScale: normal(.018), envMapIntensity: .3,
    }), .04, .16, .64),
    wood: grade(physical('Pale white oak veneer', {
      ...maps('veneer', .5), color: 0xf1f4f5, roughness: .76,
      normalScale: normal(.16), clearcoat: .13, clearcoatRoughness: .4,
    }), .35, 1.4, .055),
    joinery: physical('Soft grey satin lacquer', {
      color: 0xbac1c4, roughness: .34, metalness: 0,
      clearcoat: .14, clearcoatRoughness: .35,
    }),
    trim: physical('Off-white satin painted trim', {
      color: 0xebece9, roughness: .38, clearcoat: .08, clearcoatRoughness: .4,
    }),
    recess: physical('Charcoal shadow gaps', {color: 0x272d31, roughness: .85}),
    fabric: grade(physical('Grey woven wool upholstery', {
      ...maps('wool', .2701, .2757), color: 0xc4cbd0,
      roughness: 1, normalScale: normal(.3), sheen: .65,
      sheenColor: new THREE.Color(0xc7cdd0), sheenRoughness: .87,
    }), .12, 1.35, .035),
    cushion: grade(physical('Soft silver woven cushions', {
      ...maps('wool', .2701, .2757), color: 0xe6e9e8,
      roughness: 1, normalScale: normal(.3), sheen: .7,
      sheenColor: new THREE.Color(0xe4e8e8), sheenRoughness: .9,
    }), .08, 1.5, .1),
    bed: physical('Ivory bedding · fine woven surface', {
      ...maps('wool', .18), map: null, color: 0xe9eceb,
      roughness: .99, normalScale: normal(.12), sheen: .65,
      sheenColor: new THREE.Color(0xffffff), sheenRoughness: .95,
    }),
    blanket: grade(physical('Slate blue-grey woven throw', {
      ...maps('wool', .32), color: 0x8fadb9, roughness: 1,
      normalScale: normal(.4), sheen: .6,
      sheenColor: new THREE.Color(0x9baeb9), sheenRoughness: .95,
    }), .75, 1.15, .015),
    rug: grade(physical('Textured grey wool rug', {
      ...maps('wool', .6), color: 0xe3e5e3, roughness: 1,
      normalScale: normal(.55), sheen: .55,
      sheenColor: new THREE.Color(0xbfc7cd), sheenRoughness: 1,
    }), .08, 1.35, .09),
    stone: grade(physical('Grey veined stone · honed surface', {
      ...maps('stone', 2), color: 0xaeb8bf, roughness: .64,
      normalScale: normal(.13), clearcoat: .15, clearcoatRoughness: .28,
      envMapIntensity: .9,
    }), .13, 1.15, .015),
    ceramic: physical('Glazed porcelain', {
      color: 0xf3f5f3, roughness: .17, clearcoat: .4, clearcoatRoughness: .15,
    }),
    basin: physical('Brushed stainless steel', {
      color: 0xbac2c7, roughness: .28, metalness: .9, envMapIntensity: 1,
    }),
    chrome: physical('Satin nickel hardware', {
      color: 0xd1d7da, roughness: .19, metalness: 1, envMapIntensity: 1,
    }),
    screen: physical('Dark reflective screen glass', {
      color: 0x0e141b, roughness: .13, metalness: .25,
      clearcoat: .6, clearcoatRoughness: .08,
    }),
    black: physical('Graphite powder-coated metal', {
      color: 0x293239, roughness: .38, metalness: .35,
    }),
    mirror: physical('Silver mirror', {
      color: 0xf1f4f7, roughness: .025, metalness: 1, envMapIntensity: 1.2,
    }),
    water: physical('Recessed basin interior', {
      color: 0x59656b, roughness: .23, metalness: .45,
    }),
    glass: physical('Clear architectural glazing', {
      color: 0xf7fcff, roughness: .025, metalness: 0,
      transmission: .98, thickness: .008, ior: 1.5,
      transparent: false, opacity: 1, depthWrite: false,
      side: THREE.FrontSide, envMapIntensity: 1,
    }),
  };
  for (const material of Object.values(M)) {
    material.userData.palette = 'Cool contemporary — pale timber, grey stone, dark accents';
  }
  return M;
}
