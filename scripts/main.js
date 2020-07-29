
//  Copyright © 2020 Stewart Smith. See LICENSE for details.




//  JavaScript modules. 
//  As of May 2020, Three is officially moving to modules and deprecating
//  their old non-module format. I think that’s a bummer because now you
//  MUST run a server in order to play with the latest Three code -- even
//  for the simplest examples. Such is progress?
//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

import * as THREE from './third-party/Three/three.module.js'
import { OrbitControls } from './third-party/Three/OrbitControls.js'
import { VRButton } from './third-party/Three/VRButton.js'
import { Lensflare, LensflareElement } from './third-party/Three/Lensflare.js'
import { Bolt } from './third-party/SpaceRocks/Bolt.js'




//  Some toggles and values I’ve been toying with.

const params = {

	shouldPrepareVR:    true,
	shouldPrepareHands: true,
	userHeight: 1.65//  In meters of course.
}






    //////////////////
   //              //
  //   Overhead   //
 //              //
//////////////////


//  Some bits that we’ll reference across different function scopes,
//  so we’ll define them here in the outermost scope.
//  https://developer.mozilla.org/en-US/docs/Glossary/Scope

let 
camera,
scene,
renderer,
controls,
xrReferenceSpace


function setupThree(){


	//  DOM container for Three’s CANVAS element.
	//  https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
	//  https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild

	const container = document.getElementById( 'three' )


	//  Perspective camera.
	//  https://threejs.org/docs/#api/en/cameras/PerspectiveCamera

	const
	fieldOfView = 75,
	aspectRatio = window.innerWidth / window.innerHeight,
	near = 0.01,
	far  = 1000

	camera = new THREE.PerspectiveCamera( 
		
		fieldOfView, 
		aspectRatio,
		near,
		far 
	)
	camera.position.set( 0, params.userHeight, 6 )

	
	//  Scene.
	//  https://threejs.org/docs/#api/en/scenes/Scene

	scene = new THREE.Scene()
	scene.background = new THREE.Color( 0x666666 )
	scene.add( camera )


	//  WebGL renderer.
	//  https://threejs.org/docs/#api/en/renderers/WebGLRenderer

	renderer = new THREE.WebGLRenderer({ antialias: true })
	renderer.autoClear = false
	renderer.setPixelRatio( window.devicePixelRatio )
	renderer.setSize( window.innerWidth, window.innerHeight )
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFSoftShadowMap
	renderer.physicallyCorrectLights = true
	renderer.toneMapping = THREE.ACESFilmicToneMapping
	renderer.outputEncoding = THREE.sRGBEncoding
	if( params.shouldPrepareVR ){
	
		renderer.xr.enabled = true
		container.appendChild( VRButton.createButton( renderer ))
	}
	container.appendChild( renderer.domElement )


	//  Orbit controls.
	//  https://threejs.org/docs/#examples/en/controls/OrbitControls
	
	controls = new OrbitControls( camera, renderer.domElement )
	controls.target.set( 0, params.userHeight, 0 )
	controls.update()


	//  When our window size changes
	//  we must update our camera and our controls.

	window.addEventListener( 'resize', function(){
	
		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()
		renderer.setSize( window.innerWidth, window.innerHeight )
		controls.update()

	}, false )


	//  I made these quick toggles for easy trouble shooting
	//  as I kept crashing the Oculus browser and had to do
	//  a lot of investigating.

	if( params.shouldPrepareVR ){
	
		renderer.xr.onSessionStartedCallback = function( session ){

			if( params.shouldPrepareHands ) setupHandMeshes()
			
			session
			.requestReferenceSpace( 'local' )
			.then( function( referenceSpace ){
			
				xrReferenceSpace = referenceSpace
				.getOffsetReferenceSpace(

					new XRRigidTransform({ x: 0, y: params.userHeight, z: 0 })
				)
			})
		}
	}


	//  Our old standby, window.requestAnimationFrame()
	//  attempts to execute at 60 frames per second.
	//  But we can only use this for normal 2D screen presentations.
	//  https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
	
	//  Meanwhile, when we enter VR we must instead use 
	//  VRDisplay.requestAnimationFrame()
	//  which attempts to execute at 90 frames per second.
	//  https://developer.mozilla.org/en-US/docs/Web/API/VRDisplay/requestAnimationFrame
	
	//  So that’s two different methods to call,
	//  and two different frame rates.
	//  Three.js now abstracts that all away 
	//  with its (relatively) new renderer.setAnimationLoop().
	//  Just pass it your main animation function
	//  and it will pass two arguments to it:
	//  the current clock time and the XR frame data.
	//  https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setAnimationLoop
	//  https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content
	
	renderer.setAnimationLoop( loop )
}






    /////////////////
   //             //
  //   Content   //
 //             //
/////////////////


function setupContent() {


	//  Milky Way galaxy background. 
	//  These texture are included this Three VR demo:
	//  https://threejs.org/examples/#webxr_vr_sandbox
	//  https://threejs.org/docs/#api/en/loaders/CubeTextureLoader
	//  Note that CubeTextureLoader is a form of Loader:
	//  https://threejs.org/docs/#api/en/loaders/Loader

	const background = new THREE.CubeTextureLoader()
	.setPath( 'media/milkyway/' )
	.load([ 

		'dark-s_px.jpg', 
		'dark-s_nx.jpg', 
		'dark-s_py.jpg', 
		'dark-s_ny.jpg', 
		'dark-s_pz.jpg', 
		'dark-s_nz.jpg' 
	])


	//  Now we can set the Milky Way as our scene’s background.

	scene.background = background


	//  Let’s create a circular platform to “stand” on in space.
	//  To create a 3D “thing” we must create a “Mesh”:
	//  https://threejs.org/docs/#api/en/objects/Mesh

	const platform = new THREE.Mesh( 


		//  Every Mesh needs geometry; a collection of 3D points to use.
		//  For this platform we’ll use some pre-defined geometry
		//  that describes a circle:
		//  https://threejs.org/docs/#api/en/geometries/CircleBufferGeometry

		new THREE.CircleBufferGeometry( 4, 12 ),


		//  For this Mesh we’ll use the “MeshStandardMaterial”.
		//  https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
		//  This Material uses “Physically based rendering” (PBR).
		//  https://en.wikipedia.org/wiki/Physically_based_rendering

		new THREE.MeshStandardMaterial({
		
			color: 0xFFEECC,
			emissiveColor: 0x666666,
			roughness: 0.2,
			metalness: 1.0,
			envMapIntensity: 1.0,
			transparent: true,
			opacity: 1
		})
	)

	
	//  In Three.js all flat 2D shapes are drawn vertically.
	//  This means that for any 2D shape 
	//  that we’d like to use as a floor,
	//  we  must rotate it 90 degrees (π ÷ 2 radians)
	//  so that it is horizontal rather than vertical.
	//  Here, we’ll rotate negatively (π ÷ -2 radians)
	//  so the visible surface ends up on top.
	
	platform.rotation.x = Math.PI / -2


	//  By default meshes do not receive shadows.
	// (This keeps rendering speedy!)
	//  So we must turn on shadow reception manually.
	
	platform.receiveShadow = true


	//  And we want our platform to actually exist in our world
	//  so we must add it to our scene.

	scene.add( platform )


	//  Environment map.
	//  https://threejs.org/examples/webgl_materials_envmaps_exr.html
	
	const pmremGenerator = new THREE.PMREMGenerator( renderer )
	pmremGenerator.compileCubemapShader()
	THREE.DefaultLoadingManager.onLoad = function(){

		pmremGenerator.dispose()
	}
	let cubeRenderTarget
	new THREE.CubeTextureLoader()
	.setPath( 'media/milkyway/' )
	.load([ 

		'dark-s_px.jpg', 
		'dark-s_nx.jpg', 
		'dark-s_py.jpg', 
		'dark-s_ny.jpg', 
		'dark-s_pz.jpg', 
		'dark-s_nz.jpg' 
	
	], function( texture ){

		texture.encoding = THREE.sRGBEncoding
		const cubeRenderTarget = pmremGenerator.fromCubemap( texture )
		platform.material.envMap = cubeRenderTarget.texture
		platform.material.needsUpdate = true
		texture.dispose()
	})


	//  Let there by light.
	//  Directional lights create parallel light rays.
	//  https://threejs.org/docs/#api/en/lights/DirectionalLight

	const light = new THREE.DirectionalLight( 0xFFFFFF )
	light.position.set( -2, 4, 0 )
	light.castShadow = true
	light.shadow.camera.top    =  4
	light.shadow.camera.bottom = -4
	light.shadow.camera.right  =  4
	light.shadow.camera.left   = -4
	light.shadow.mapSize.set( 2048, 2048 )
	scene.add( light )
	scene.add( new THREE.AmbientLight( 0x888888 ))


	//  Lensflare !
	//  These textures come from the Three.js repository.
	//  https://threejs.org/docs/#examples/en/objects/Lensflare

	const 
	loader    = new THREE.TextureLoader(),
	texture0  = loader.load( 'media/lensflare/lensflare0.png' ),
	texture3  = loader.load( 'media/lensflare/lensflare3.png' ),
	lensflare = new Lensflare()

	lensflare.position.copy( light.position )
	lensflare.addElement( new LensflareElement( texture0, 700, 0.0 ))
	lensflare.addElement( new LensflareElement( texture3,  60, 0.6 ))
	lensflare.addElement( new LensflareElement( texture3,  70, 0.7 ))
	lensflare.addElement( new LensflareElement( texture3, 120, 0.9 ))
	lensflare.addElement( new LensflareElement( texture3,  70, 1.0 ))
	scene.add( lensflare )
}






    ///////////////
   //           //
  //   Hands   //
 //           //
///////////////


//  Let’s begin by creating a “hands” object
//  and within that a “left” hand.
//  Later we’ll create a “right” hand
//  by cloning the “left” object.

const hands = {

	left:  {

		joints: [],
		bones:  []
	},
	jointGeometry: new THREE.BoxBufferGeometry( 1, 1, 1 ),
	boneGeometry:  new THREE.CylinderGeometry( 0.005, 0.005, 0.1, 8 )
}


//  Add some gesture flags.
//  This enables us to document the state of our hands
//  such as hands.left.isPointGesture,
//  or hands.right.wasShootGesture, etc.

;[ 

	'Fist',
	'L',
	'Pinch',
	'Point'
	
].forEach( function( gesture ){

	hands.left[  'is'+ gesture +'Gesture' ] = false
	hands.left[ 'was'+ gesture +'Gesture' ] = false
})


//  Now we can create our “right” hand
//  by cloning the “left” hand
//  and also adding right-hand-specific properties.

hands.right = Object.assign( {}, hands.left, {

	name: 'Right',
	jointMaterialColor: 0xCC3300,
	jointMaterial: new THREE.MeshStandardMaterial({

		color: 0xFF3300,
		roughness: 0,
		metalness: 0
	}),
	boneMaterialColor: 0x990000,
	boneMaterial: new THREE.MeshStandardMaterial({

		color: 0xCC0000,
		roughness: 0,
		metalness: 0
	})
})


//  Great. We have a fully fleshed out “right” hand.
//  But we hadn’t added and left-hand-specific properties
//  to our “left” hand yet
//  because we wanted to clone it to create the “right”.
//  We’ve done that now,
//  so it’s safe to add left-hand-specific properties.

Object.assign( hands.left, {

	name: 'Left',
	jointMaterialColor: 0x00CC33,
	jointMaterial: new THREE.MeshStandardMaterial({

		color: 0x00FF33,
		roughness: 0,
		metalness: 0
	}),
	boneMaterialColor: 0x009900,
	boneMaterial: new THREE.MeshStandardMaterial({

		color: 0x00CC00,
		roughness: 0,
		metalness: 0
	})
})




function setupHandMeshes(){
	

	//  For both hands
	//  let’s make sure we remove any existing
	//  bones or joints.
	//  Not how easy it is in JavaScript to say 
	// “do this action for multiple things” using Arrays.
	//  We stick a semicolon in front as good practice
	//  to ensure that our raw Array
	//  is not interpreted as an object property reference.
	//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach

	;[ hands.left, hands.right ]
	.forEach( function( hand ){


		//  We must remove bone and joint meshes
		//  from our THREE scene.
		//  We can just scoop up booth Arrays
		//  and operate on them together with concat().
		//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat

		hand.bones
		.concat( hand.joints )
		.forEach( function( mesh ){

			scene.remove( mesh )
		})


		//  Now we can assign empty Arrays
		//  to each list.

		hand.bones  = []
		hand.joints = []
	})

	
	const
	createJointMesh = function( hand, index ){
		
		const mesh = new THREE.Mesh( 

			hands.jointGeometry,
			hand.jointMaterial
		)
		mesh.visible = false
		mesh.receiveShadow = true
		mesh.castShadow = true
		mesh.jointIndex = index
		scene.add( mesh )
		hand.joints[ index ] = mesh
	},
	createBoneMesh = function( hand, index ){
		
		const mesh  = new THREE.Mesh(

			hands.boneGeometry,
			hand.boneMaterial
		)
		mesh.visible = false
		mesh.receiveShadow = true
		mesh.castShadow = true		
		mesh.boneIndex = index
		scene.add( mesh )
		hand.bones[ index ] = mesh
	}


	//  Create a mesh for each hand joint.

	for( 

		let 
		i  =  0;//XRHand.WRIST; 
		i <= 24;//XRHand.LITTLE_PHALANX_TIP;
		i ++ ){
		
		createJointMesh( hands.left,  i )
		createJointMesh( hands.right, i )
	}


	//  We’ll come back to the joinConnections problem later.
	//  For now it’s incomplete and disabled.

	// for( const connection of jointConnections ){
		
		// createBoneMesh( hands.left,  i )
		// createBoneMesh( hands.right, i )
	// }
}




/*

	Forgive me. I realize these gestures are inherently ableist. 
	Allow me to begin with what I know and what I can test myself,
	then once that is functional I can expand my thinking. 


	Here’s the index map of joints provided by the WebXR Hand API.
	Note that the metacarpals for index, middle, and ring
	all return NULL instead of jointPoses!!
	https://github.com/immersive-web/webxr-hand-input/blob/master/explainer.md#appendix-proposed-idl

	 0 : WRIST
	 1 : THUMB_METACARPAL
	 2 : THUMB_PHALANX_PROXIMAL
	 3 : THUMB_PHALANX_DISTAL
	 4 : THUMB_PHALANX_TIP

X	 5 : INDEX_METACARPAL
	 6 : INDEX_PHALANX_PROXIMAL
	 7 : INDEX_PHALANX_INTERMEDIATE
	 8 : INDEX_PHALANX_DISTAL
	 9 : INDEX_PHALANX_TIP

X	10 : MIDDLE_METACARPAL
	11 : MIDDLE_PHALANX_PROXIMAL
	12 : MIDDLE_PHALANX_INTERMEDIATE
	13 : MIDDLE_PHALANX_DISTAL
	14 : MIDDLE_PHALANX_TIP

X	15 : RING_METACARPAL
	16 : RING_PHALANX_PROXIMAL
	17 : RING_PHALANX_INTERMEDIATE
	18 : RING_PHALANX_DISTAL
	19 : RING_PHALANX_TIP

	20 : LITTLE_METACARPAL
	21 : LITTLE_PHALANX_PROXIMAL
	22 : LITTLE_PHALANX_INTERMEDIATE
	23 : LITTLE_PHALANX_DISTAL
	24 : LITTLE_PHALANX_TIP

*/
function isFistGesture( hand ){


	//  We will consider a fist to be
	//  all fingers curled inward such that
	//  the finger tips are somewhat close
	//  to the base of the finger
	//  and the thumb tip is near the
	//  middle middle finger’s intermediate joint.
	//  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

	//  THESE VALUES AREN’T VERY GOOD.
	//  Will require more experimenting
	//  and possibly a different definition of a fist.

	return [ 

		'INDEX',
		'MIDDLE',
		'RING',
		'LITTLE'

	].reduce( function( status, fingerName ){

		return status && (

			hand.joints[ fingerName +'_PHALANX_TIP' ].position
			.distanceTo(

				hand.joints[ fingerName +'_PHALANX_PROXIMAL' ].position
			
			) < 0.04
		)
	}, true ) &&
	hand.joints[ 'THUMB_PHALANX_TIP' ].distanceTo(

		hand.joints[ 'MIDDLE_PHALANX_INTERMEDIATE' ]

	) < 0.03
}
function isPinchGesture( hand ){
	
	const 
	indexTip = hand.joints[ XRHand.INDEX_PHALANX_TIP ],
	thumbTip = hand.joints[ XRHand.THUMB_PHALANX_TIP ],
	distance = indexTip.position.distanceTo( thumbTip.position )
	
	return distance < 0.03
}
function isLGesture( hand ){

	return (


		//  Index finger is extended.

		hand.joints[ XRHand.INDEX_PHALANX_TIP ].position
		.distanceTo(

			hand.joints[ XRHand.INDEX_PHALANX_PROXIMAL ].position

		) > 0.05 &&
	

		//  Middle finger is curled inward,
		//  toward the base of the thumb.

		hand.joints[ XRHand.MIDDLE_PHALANX_TIP ].position
		.distanceTo(

			hand.joints[ XRHand.THUMB_METACARPAL ].position

		) < 0.06 &&


		//  We don’t really need to look for the ring finger.
		//  You try extending it while also pointing your index!
		//  Pinky finger is curled inward.

		hand.joints[ XRHand.LITTLE_PHALANX_TIP ].position
		.distanceTo(

			hand.joints[ XRHand.LITTLE_METACARPAL ].position

		) < 0.06
	)
}
function isPointGesture( hand ){


	//  Is a pointing gesture AND
	//  the thumb tip is near the middle
	//  of the middle finger.

	return (

		isLGesture( hand ) &&
		hand.joints[ XRHand.THUMB_PHALANX_TIP ].position
		.distanceTo(

			hand.joints[ XRHand.MIDDLE_PHALANX_INTERMEDIATE ].position

		) < 0.06
	)
}




function updateInputSources( session, frame, referenceSpace ){
	
	for( let inputSource of session.inputSources ){
		/*

		Here’s a sample inputSource object:
		{			
			gamepad: null,
			gripSpace: null,
			hand: XRHand {...},
			handedness: 'left',
			profiles: [ 'oculus-hand', 'generic-trigger' ],
			targetRayMode: 'gaze',
			targetRaySpace: XRSpace
		}

		*/
		if( inputSource.hand ){

			hands[ inputSource.handedness ].joints
			.forEach( function( mesh ){
				
				const jointData = inputSource.hand[ mesh.jointIndex ]
				if( jointData ){

					// console.log( 'jointData', jointData )
					const jointPose = frame.getJointPose( jointData, referenceSpace )
					if( jointPose ){
					
						// console.log( 'jointPose', jointPose )
						mesh.visible = true
						mesh.position.copy( jointPose.transform.position )
						mesh.position.y += params.userHeight//  Necessary?!?
						mesh.quaternion.copy( jointPose.transform.orientation )
						if( jointPose.radius ){

							mesh.scale.setScalar( jointPose.radius * 2 )
						}
						else mesh.scale.setScalar( 0.015 )
					}
					else mesh.visible = false
				}
				else mesh.visible = false
			})
		}//  if( inputSource.hand )
	}//  for( let inputSource of session.inputSources )
}






    //////////////
   //          //
  //   Loop   //
 //          //
//////////////


let timePrevious

function loop( timeNow, frame ){

	if( params.shouldPrepareVR &&
		params.shouldPrepareHands &&
		frame !== null && 
		xrReferenceSpace !== null ){
	
		const session = renderer.xr.getSession()
		if( session && session.inputSources ){
			
			updateInputSources( session, frame, xrReferenceSpace )
			;[ hands.left, hands.right ]
			.forEach( function( hand ){


				//  NOTE. The following code is pretty repetitive.
				//  Probably a good idea to create custom events instead.
				//  That way you can do something onBegan or onEnded.


				//  Fist gesture.

				hand.isFistGesture = isPinchGesture( hand )
				if( hand.isFistGesture ){

					if( !hand.wasFistGesture ){

						console.log( 'Fist gesture began.' )
						//  Your custom code here!
						hand.wasFistGesture = true
					}
				}
				else if( hand.wasFistGesture ){

					console.log( 'Fist gesture ended.' )
					//  Your custom code here!
					hand.wasFistGesture = false
				}


				//  L gesture.

				hand.isLGesture = isLGesture( hand )
				if( hand.isLGesture ){

					if( !hand.wasLGesture ){

						console.log( 'L gesture began.' )
						//  Your custom code here!
						hand.wasLGesture = true
					}
				}
				else if( hand.wasLGesture ){

					console.log( 'L gesture ended.' )
					//  Your custom code here!
					hand.wasLGesture = false
				}


				//  Pinch gesture.

				hand.isPinchGesture = isPinchGesture( hand )
				if( hand.isPinchGesture ){

					if( !hand.wasPinchGesture ){

						console.log( 'Pinch gesture began.' )
						//  Your custom code here!
						hand.wasPinchGesture = true
					}
				}
				else if( hand.wasPinchGesture ){

					console.log( 'Pinch gesture ended.' )
					//  Your custom code here!
					hand.wasPinchGesture = false
				}


				//  Point gesture.
				//  This is our main interest here.

				hand.isPointGesture = isPointGesture( hand )
				if( hand.isPointGesture ){

					if( !hand.wasPointGesture ){

						console.log( 'Point gesture began.' )
						hand.jointMaterial.color.setHex( 0xFFCC00 )						
						hand.wasPointGesture = true
					}
					const bolt = new Bolt( scene, hand, hand.joints[ XRHand.WRIST ], 0 )
					if( bolt ){

						// console.log( 'Shots fired!' )
					}
				}
				else if( hand.wasPointGesture ){

					console.log( 'Point gesture ended.' )
					hand.jointMaterial.color.setHex( hand.jointMaterialColor )
					hand.wasPointGesture = false
				}
			})
		}
	}


	//  Determine the time since last frame in SECONDS (not milliseconds).
	//  Then perform all the animation updates based on that.

	if( timePrevious === undefined ) timePrevious = timeNow
	const timeDelta = ( timeNow - timePrevious ) / 1000
	timePrevious = timeNow
	

	Bolt.update( timeDelta )
	renderer.render( scene, camera )
}






    //////////////
   //          //
  //   Boot   //
 //          //
//////////////


window.addEventListener( 'DOMContentLoaded', function(){

	setupThree()
	setupContent()
	// setupHandMeshes()
	console.log( 'hands', hands )
})







