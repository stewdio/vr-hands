
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

			if( params.shouldPrepareHands ) setupHands()
			
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
	renderer.setAnimationLoop( loop )
}






    /////////////////
   //             //
  //   Content   //
 //             //
/////////////////


function setupContent() {


	//  Milky Way galaxy background. 

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
	scene.background = background


	//  Something to “stand” on in space.

	const floor = new THREE.Mesh( 

		new THREE.PlaneBufferGeometry( 6, 6 ),
		new THREE.MeshStandardMaterial({
		
			color: 0xFFFFFF,
			roughness: 1.0,
			metalness: 1.0,
			transparent: true,
			opacity: 0.95
		})
	)
	floor.rotation.x = Math.PI / -2
	floor.receiveShadow = true
	scene.add( floor )


	//  Let there by light.

	const light = new THREE.DirectionalLight( 0xFFFFFF )
	light.position.set( 2, 4, 0 )
	light.castShadow = true
	light.shadow.camera.top    =  2
	light.shadow.camera.bottom = -2
	light.shadow.camera.right  =  2
	light.shadow.camera.left   = -2
	light.shadow.mapSize.set( 1024, 1024 )
	scene.add( light )
	scene.add( new THREE.HemisphereLight( 0x886666, 0x446666 ))


	//  Lensflare !

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


const hands = {

	left:  {

		joints: [],
		bones:  []
	},
	jointGeometry: new THREE.IcosahedronBufferGeometry( 1, 1 ),
	boneGeometry:  new THREE.CylinderGeometry( 0.005, 0.005, 0.1, 8 )
}


//  Add some gesture flags.

;[ 

	'Fist',
	'Pinch',
	'Point',
	'Shoot'
	
].forEach( function( gesture ){

	hands.left[  'is'+ gesture +'Gesture' ] = false
	hands.left[ 'was'+ gesture +'Gesture' ] = false
})




hands.right = Object.assign( {}, hands.left, {

	name: 'Right',
	jointMaterialColor: 0xCC3300,
	jointMaterial: new THREE.MeshStandardMaterial({

		color: 0xCC3300,
		roughness: 0.6,
		metalness: 0.1
	}),
	boneMaterialColor: 0x990000,
	boneMaterial: new THREE.MeshStandardMaterial({

		color: 0x990000,
		roughness: 0.6,
		metalness: 0.1
	})
})
Object.assign( hands.left, {

	name: 'Left',
	jointMaterialColor: 0x00CC33,
	jointMaterial: new THREE.MeshStandardMaterial({

		color: 0x00CC33,
		roughness: 0.6,
		metalness: 0.1
	}),
	boneMaterialColor: 0x009900,
	boneMaterial: new THREE.MeshStandardMaterial({

		color: 0x009900,
		roughness: 0.6,
		metalness: 0.1
	})
})




function setupHands(){
	

	//  For both hands
	//  let’s make sure we remove any existing
	//  bones or joints.

	;[ hands.left, hands.right ]
	.forEach( function( hand ){


		//  We must remove bone and joint meshes
		//  from our THREE scene.

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


	//  Create a mesh for each hand joint
	//  and a mesh for each bone joint.

	for( 

		let 
		i  =  0;//XRHand.WRIST; 
		i <= 24;//XRHand.LITTLE_PHALANX_TIP;
		i ++ ){
		
		createJointMesh( hands.left,  i )
		createJointMesh( hands.right, i )
	}
	// for( const connection of jointConnections ){
		
		// createBoneMesh( hands.left,  i )
		// createBoneMesh( hands.right, i )
	// }
}






/*

	Forgive me. I realize these gestures are inherently ableist. 
	Allow me to begin with what I know and what I can test myself,
	then once that is functional I can expand my thinking. 



	https://github.com/immersive-web/webxr-hand-input/blob/master/explainer.md#appendix-proposed-idl

	Note that the metacarpals for index, middle, and ring
	all return NULL instead  of jointPoses!!

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

	/*


	all fingers are curled inward
	and thumb tip is nearr middle intermediate.

	*/
}
function isPinchGesture( hand ){
	
	const 
	indexTip = hand.joints[ XRHand.INDEX_PHALANX_TIP ],
	thumbTip = hand.joints[ XRHand.THUMB_PHALANX_TIP ],
	distance = indexTip.position.distanceTo( thumbTip.position )
	
	return distance < 0.02
}
function isPointGesture( hand ){

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
function isShootGesture( hand ){


	//  Is a pointing gesture AND
	//  the thumb tip is near the middle
	//  of the middle finger.

	return (

		isPointGesture( hand ) &&
		hand.joints[ XRHand.THUMB_PHALANX_TIP ].position
		.distanceTo(

			hand.joints[ XRHand.MIDDLE_PHALANX_INTERMEDIATE ].position

		) < 0.06
	)
}




function updateInputSources( session, frame, referenceSpace ){
	
	for( let inputSource of session.inputSources ){
		/*

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

			let visible = false
			hands[ inputSource.handedness ].joints.forEach( function( mesh ){
				
				const jointData = inputSource.hand[ mesh.jointIndex ]
				if( jointData ){

					const jointPose = frame.getJointPose( jointData, referenceSpace )
					if( jointPose ){
					
						mesh.visible = true
						mesh.position.copy( jointPose.transform.position )
						mesh.position.y += params.userHeight//  Necessary?!?
						mesh.quaternion.copy( jointPose.transform.orientation )
						const radius = 0.007
						mesh.scale.set( radius, radius, radius )
					}
					else {

						mesh.visible = false
					}
				}
				else mesh.visible = false
			})
		}
	}
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

				hand.isShootGesture = isShootGesture( hand )
				if( hand.isShootGesture ){

					if( !hand.wasShootGesture ){

						hand.jointMaterial.color.setHex( 0xFFCC00 )						
						hand.wasShootGesture = true
					}
					const bolt = new Bolt( scene, hand, hand.joints[ XRHand.WRIST ], 0 )
					if( bolt ){

						// console.log( 'Shots fired!' )
					}
				}
				else if( hand.wasShootGesture ){

					hand.jointMaterial.color.setHex( hand.jointMaterialColor )
					hand.wasShootGesture = false
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
	setupHands()	
	console.log( 'hands', hands )
})







