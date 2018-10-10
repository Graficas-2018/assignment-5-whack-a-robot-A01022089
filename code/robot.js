var renderer = null,
scene = null,
camera = null,
root = null,
robot_idle = null,
robot_attack = null,
group = null,
deadAnimator = null,
clock = null,
period = 0, //clone a robot each period secons
robotTimer = 0;
//robot_container = new THREE.Object3D;
//robot_container.name = "container";
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;
var camera, scene, raycaster, renderer;
var newRobot = null;
var runAnimation = null;

var hitted = 0, record = 0, missed = 0;

var robot_mixer = {};
var deadAnimator;
var morphs = [];

var duration = 500; // ms
var currentTime = Date.now();

var animation = "run";

var playing = false, cloning = false, game1 = false;
var robots = [];
var actions = [];

function createDeadAnimation()
{
  deadAnimator = new KF.KeyFrameAnimator;
  deadAnimator.init({
    interps:
        [
            {
                keys:[0, 1.0],
                values:[
                        { z : 0 },
                        { z : -Math.PI * .5 },
                        ],
                //target: robot_container.rotation
            },
        ],
    loop: false,
    duration:duration * 1,
  });

}

function onDocumentMouseDown(event)
{
    event.preventDefault();
    event.preventDefault();
    //mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    //mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    mouse.x = ( event.clientX / 1000 ) * 2 - 1;
    mouse.y = - ( event.clientY / 900 ) * 2 + 1;

    // find intersections
    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( scene.children, true ); //recursivo para encuentre dentro de los hijos

    if ( intersects.length > 0 )
    {
        CLICKED = intersects[ 0 ].object;
        console.log("Intersected object", CLICKED.parent.name);

        for(var i = 0; i<= deadAnimator.interps.length -1; i++)
        {
            deadAnimator.interps[i].target = CLICKED.parent.rotation;
        }
        //deadAnimator.interps[0].target = CLICKED.parent.rotation;

        if( CLICKED.parent.dead != true && CLICKED.parent.name == "robot"){
            deadAnimator.start();
            CLICKED.parent.time = clock; 
            hitted++;  
            CLICKED.parent.dead = true;

        }
        console.log("Dead: ", CLICKED.parent.dead);
    }
    else
    {
        CLICKED = null;
    }
}

function loadFBX()
{
    var loader = new THREE.FBXLoader();
    loader.load( '../models/Robot/robot_idle.fbx', function ( object )
    {
        robot_mixer["idle"] = new THREE.AnimationMixer( scene );
        object.scale.set(0.02, 0.02, 0.02);
        object.position.y -= 4;
        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );
        object.name = 'robot';
        object.dead = false;
        robot_idle = object;

        //robots.push(object);
        robot_idle.rotation.set(0,Math.PI*.5,0);
        //scene.add(object);


        loader.load( '../models/Robot/robot_run.fbx', function ( object )
        {
            robot_mixer["run"] = new THREE.AnimationMixer( scene );
            robot_mixer["run"].clipAction( object.animations[ 0 ], robot_idle ).play();
            runAnimation = object.animations[ 0 ];
        } );
    } );
}

function cloneRobot()
{
    if(robot_idle != null && runAnimation)
    {
        newRobot = cloneFbx(robot_idle);
        newRobot.mixer =  new THREE.AnimationMixer( scene );
        newRobot.position.set(-70,0,( Math.random() * 100 - 20)); //-20 to 80

        var action = newRobot.mixer.clipAction(  runAnimation, newRobot );
        actions.push(action);
        action.play();
        newRobot.dead = false;
        robots.push(newRobot);
        scene.add(robots[robots.length-1]);
        clone = true;
    }
}

function animate() {

    var now = Date.now();
    var deltat = now - currentTime;
    currentTime = now;


    if( playing == true){
        
        clock = clock + 0.005;
        robotTimer+=0.005;
        document.getElementById("time").innerHTML = "time: "+clock;
        document.getElementById("score").innerHTML = "score: "+hitted + " RECORD: "+record;


        for(var rob of robots)
        {
            if(rob.dead != true)
            {
                rob.position.x += 0.02 * deltat;
                if(rob.position.x > 120)
                {
                    //rob.position.x = -70 - Math.random() * 50;
                    scene.remove(rob);
                }
            }

            if(rob.dead == true)
            {
                KF.update();
                if((clock - rob.time) > 2)
                    scene.remove(rob);  
            }
        }

        if(robot_idle && robot_mixer[animation])
        {
            robot_mixer[animation].update(deltat * 0.001);
        }
        if(robots)
        {
            for(var rob of robots)
            {
                rob.mixer.update(deltat * 0.001);
            }

        }
        if(robotTimer > period && cloning == true)// clone if there is enought time
        {
            console.log(period);
            robotTimer = 0;
            period = Math.random() * 4;
            cloneRobot();
        }    

        if(clock > 57) //57 seconds of clonning
        {
            cloning = false;
        }
        if(clock > 60) //60 seconds until the last posible robot exits the screen
        {
            playing = false;
            game1 = true;
        }
    }
    else{
        if(hitted > record)  //new record
        {
            record = hitted;
            document.getElementById("score").innerHTML = "NEW RECORD: "+record+ " CLICK START TO PLAY AGAIN";
        }
        if( hitted < record)
        {
            if(game1 == true) //display this message after the first game
            {
                document.getElementById("score").innerHTML = "YOUR SCORE: "+hitted+ " CLICK START TO PLAY AGAIN";
            }
        }
    }
}

function run() {
    requestAnimationFrame(function() { run(); });

        // Render the scene
        renderer.render( scene, camera );

        // Spin the cube for next frame
        animate();
}

function setLightColor(light, r, g, b)
{
    r /= 255;
    g /= 255;
    b /= 255;

    light.color.setRGB(r, g, b);
}

var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "../images/checker_large.gif";

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function createScene(canvas) {

    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );

    // Set the viewport size
    //renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setSize(1000, 700);


    // Turn on shadows
    renderer.shadowMap.enabled = true;
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create a new Three.js scene
    scene = new THREE.Scene();

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 10000 );
    camera.position.set(0, 25, 100);
    //camera.rotation.x += Math.PI*.5;
    camera.rotation.set(-.5,0,0);
    //scene.add(camera);

    // Create a group to hold all the objects
    root = new THREE.Object3D;

    spotLight = new THREE.SpotLight (0xffffff);
    //root.add(spotLight);

    spotLight.castShadow = true;

    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;

    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    ambientLight = new THREE.AmbientLight ( 0xAAAAAA );
    root.add(ambientLight);

    // Create the objects
    robot_container = new THREE.Object3D;
    loadFBX();

    // Create a group to hold the objects
    group = new THREE.Object3D;
    root.add(group);

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl);
    map.dead = true; //just to not move the map
    map.name = "map";
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 8);

    var color = 0xffffff;

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.02;

    // Add the mesh to our group
    group.add( mesh );
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    raycaster = new THREE.Raycaster();

    document.addEventListener('mousedown', onDocumentMouseDown);

    // Now add the group to our scene
    scene.add( root );
    createDeadAnimation();
}

function start()
{
    if(playing == false)
    { 
        clock = 0; //initiate time in 0
        period = 1; //first robot
        robotTimer = 0; //count the time for the next robot
        hitted = 0; //hitted robots
        playing = true; //begin to play
        cloning  = true; //begin to clone
    }
}