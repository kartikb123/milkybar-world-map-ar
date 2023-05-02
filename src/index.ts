// import * as THREE from "three";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import * as ZapparThree from "@zappar/zappar-threejs";

declare var THREE: any;
let GLTFLoader = THREE.GLTFLoader;
declare var ZapparThree: any;

// import "./index.css";

// ZapparThree provides a LoadingManager that shows a progress bar while
// the assets are downloaded
let manager = new ZapparThree.LoadingManager();

// Setup ThreeJS in the usual way
let renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Setup a Zappar camera instead of one of ThreeJS's cameras
let camera = new ZapparThree.Camera();
camera.backgroundTexture.encoding = THREE.sRGBEncoding;

// The Zappar library needs your WebGL context, so pass it
ZapparThree.glContextSet(renderer.getContext());

// Create a ThreeJS Scene and set its background to be the camera background texture
let scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

// Request the necessary permission from the user
ZapparThree.permissionRequestUI().then(function (granted: boolean) {
    if (granted) camera.start();
    else ZapparThree.permissionDeniedUI();
});

// Set up our instant tracker group
let tracker = new ZapparThree.InstantWorldTracker();
let trackerGroup: any = new ZapparThree.InstantWorldAnchorGroup(camera, tracker);
scene.add(trackerGroup);

// let env = new ZapparThree.CameraEnvironmentMap();
// scene.environment = env.environmentMap;

let light = new THREE.DirectionalLight();
light.target = trackerGroup;
light.castShadow = true;

light.position.set(0, 1, 0);
trackerGroup.add(light);

let ambient = new THREE.AmbientLight("white", 0.03);
trackerGroup.add(ambient);
// Add some content
let box = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(require("./hotspot.png").default),
        transparent: true
    })
);
box.position.set(0, 0, 0);
box.rotateX(-0.5 * Math.PI);
trackerGroup.add(box);

let placementTime = 0;

let mixer: any;

let playAnimation : undefined | (() => void);
let pickUp : undefined | (() => void);
const gltfLoader = new GLTFLoader(manager);
const model = new URL('./RobotExpressive.glb', import.meta.url).href;
gltfLoader.load(model, (gltf:any) => {
  // Now the model has been loaded, we can add it to our instant_tracker_group
  trackerGroup.add(gltf.scene);
  gltf.scene.scale.set(0.3, 0.3, 0.3);
  console.log(gltf.animations);

  gltf.scene.traverse((node: any) => {
      node.frustumCulled = false;
      if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
      }
  });
}, undefined, () => {
  console.log('An error ocurred loading the GLTF model');
});
// new GLTFLoader().load(require("./RobotExpressive.glb").default, (gltf: any) => {
//     trackerGroup.add(gltf.scene);
//     gltf.scene.scale.set(0.3, 0.3, 0.3);
//     console.log(gltf.animations);

//     gltf.scene.traverse((node: any) => {
//         node.frustumCulled = false;
//         if (node instanceof THREE.Mesh) {
//             node.castShadow = true;
//             node.receiveShadow = true;
//         }
//     });
        


//     mixer = new THREE.AnimationMixer(gltf.scene);
//     let clip = THREE.AnimationClip.findByName(gltf.animations, 'Jump');
//     console.log(clip);
//     let action = mixer.clipAction(clip);
//     action.play();
//     action.time = 0.3;
//     action.paused = true;
//     // action.loop = LoopOnce;

//     clip = THREE.AnimationClip.findByName(gltf.animations, 'Idle');
//     let idleAction = mixer.clipAction(clip);

//     clip = THREE.AnimationClip.findByName(gltf.animations, 'Wave');
//     let waveAction = mixer.clipAction(clip);
    
//     playAnimation = async () => {
//         if (!hasPlaced) return;
//         action.paused = false;
//         action.fadeOut(0.5);
//         idleAction.reset().setEffectiveTimeScale( 1 ).setEffectiveWeight( 1 ).fadeIn( 0.5 ).play();
//         let pt = placementTime;

//         while(true) {
//             if (pt !== placementTime) return;
//             await delay(3000 + Math.random() * 3000);
//             if (pt !== placementTime) return;
//             if (!hasPlaced) return;
//             idleAction.fadeOut(0.5);
//             waveAction.reset().setEffectiveTimeScale( 1 ).setEffectiveWeight( 1 ).fadeIn( 0.5 ).play();

//             await delay(1500);
//             if (pt !== placementTime) return;
//             if (!hasPlaced) return;
//             waveAction.fadeOut(0.5);
//             idleAction.reset().setEffectiveTimeScale( 1 ).setEffectiveWeight( 1 ).fadeIn( 0.5 ).play();
//         }
//     }

//     pickUp = async () => {
//         waveAction.fadeOut(0.3);
//         idleAction.fadeOut(0.3);
//         action.reset().setEffectiveTimeScale(1).play();
//         let pt = placementTime;
//         await delay(300);
//         if (pt !== placementTime) return;
//         action.paused = true;
//     }

// })

function delay(ms: number) : Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}
let shadowPlane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.ShadowMaterial()
);
shadowPlane.rotateX(-1 * Math.PI / 2); // Rotate the plane to be flat on the ground
shadowPlane.material.opacity = 0.3; // Make the plane semi-transparent so some of the ground is visible under the shadow
shadowPlane.receiveShadow = true;
shadowPlane.material.depthWrite = false;
trackerGroup.add(shadowPlane);

let hasPlaced = false;
let placementUI = document.getElementById("zappar-placement-ui") || document.createElement("div");
placementUI.addEventListener("click", () => {

    if (hasPlaced) {
        hasPlaced = false;
        placementUI.innerText = "Place";
        box.material.opacity = 1;
        placementTime++;
        pickUp?.();
        return;
    }
    // placementUI.remove();
    placementUI.innerText = "Pick Up";
    hasPlaced = true;
    playAnimation?.();

    box.material.opacity = 0;
})

const clock = new THREE.Clock();

// Set up our render loop
function render() {
    requestAnimationFrame(render);
    camera.updateFrame(renderer);
    // env.update(renderer, camera);
    mixer?.update(clock.getDelta());

    if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, -0.5, -2.5);

    renderer.render(scene, camera);
}

requestAnimationFrame(render);











// /// Zappar for ThreeJS Examples
// /// Instant Tracking 3D Model

// // In this example we track a 3D model using instant world tracking

// import * as THREE from 'three';
// import * as ZapparThree from '@zappar/zappar-threejs';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// const model = new URL('../assets/waving.glb', import.meta.url).href;
// import './index.css';
// // The SDK is supported on many different browsers, but there are some that
// // don't provide camera access. This function detects if the browser is supported
// // For more information on support, check out the readme over at
// // https://www.npmjs.com/package/@zappar/zappar-threejs
// if (ZapparThree.browserIncompatible()) {
//   // The browserIncompatibleUI() function shows a full-page dialog that informs the user
//   // they're using an unsupported browser, and provides a button to 'copy' the current page
//   // URL so they can 'paste' it into the address bar of a compatible alternative.
//   ZapparThree.browserIncompatibleUI();

//   // If the browser is not compatible, we can avoid setting up the rest of the page
//   // so we throw an exception here.
//   throw new Error('Unsupported browser');
// }

// // ZapparThree provides a LoadingManager that shows a progress bar while
// // the assets are downloaded. You can use this if it's helpful, or use
// // your own loading UI - it's up to you :-)
// const manager = new ZapparThree.LoadingManager();

// // Construct our ThreeJS renderer and scene as usual
// const renderer = new THREE.WebGLRenderer({ antialias: true });
// const scene = new THREE.Scene();
// document.body.appendChild(renderer.domElement);

// // As with a normal ThreeJS scene, resize the canvas if the window resizes
// renderer.setSize(window.innerWidth, window.innerHeight);
// window.addEventListener('resize', () => {
//   renderer.setSize(window.innerWidth, window.innerHeight);
// });

// // Create a Zappar camera that we'll use instead of a ThreeJS camera
// const camera = new ZapparThree.Camera();

// // In order to use camera and motion data, we need to ask the users for permission
// // The Zappar library comes with some UI to help with that, so let's use it
// ZapparThree.permissionRequestUI().then((granted) => {
//   // If the user granted us the permissions we need then we can start the camera
//   // Otherwise let's them know that it's necessary with Zappar's permission denied UI
//   if (granted) camera.start();
//   else ZapparThree.permissionDeniedUI();
// });

// // The Zappar component needs to know our WebGL context, so set it like this:
// ZapparThree.glContextSet(renderer.getContext());

// // Set the background of our scene to be the camera background texture
// // that's provided by the Zappar camera
// scene.background = camera.backgroundTexture;

// // Create an InstantWorldTracker and wrap it in an InstantWorldAnchorGroup for us
// // to put our ThreeJS content into
// const instantTracker = new ZapparThree.InstantWorldTracker();
// const instantTrackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);

// // Add our instant tracker group into the ThreeJS scene
// scene.add(instantTrackerGroup);

// // Load a 3D model to place within our group (using ThreeJS's GLTF loader)
// // Pass our loading manager in to ensure the progress bar works correctly
// const gltfLoader = new GLTFLoader(manager);

// gltfLoader.load(model, (gltf) => {
//   // Now the model has been loaded, we can add it to our instant_tracker_group
//   instantTrackerGroup.add(gltf.scene);
// }, undefined, () => {
//   console.log('An error ocurred loading the GLTF model');
// });

// // Let's add some lighting, first a directional light above the model pointing down
// const directionalLight = new THREE.DirectionalLight('white', 0.8);
// directionalLight.position.set(0, 5, 0);
// directionalLight.lookAt(0, 0, 0);
// instantTrackerGroup.add(directionalLight);

// // And then a little ambient light to brighten the model up a bit
// const ambientLight = new THREE.AmbientLight('white', 0.4);
// instantTrackerGroup.add(ambientLight);

// // When the experience loads we'll let the user choose a place in their room for
// // the content to appear using setAnchorPoseFromCameraOffset (see below)
// // The user can confirm the location by tapping on the screen
// let hasPlaced = false;
// const placeButton = document.getElementById('tap-to-place') || document.createElement('div');
// placeButton.addEventListener('click', () => {
//   hasPlaced = true;
//   placeButton.remove();
// });

// // Use a function to render our scene as usual
// function render(): void {
//   if (!hasPlaced) {
//     // If the user hasn't chosen a place in their room yet, update the instant tracker
//     // to be directly in front of the user
//     instantTrackerGroup.setAnchorPoseFromCameraOffset(0, 0, -5);
//   }

//   // The Zappar camera must have updateFrame called every frame
//   camera.updateFrame(renderer);

//   // Draw the ThreeJS scene in the usual way, but using the Zappar camera
//   renderer.render(scene, camera);

//   // Call render() again next frame
//   requestAnimationFrame(render);
// }

// // Start things off
// render();
