import React, { useEffect, useRef } from 'react'
import * as BABYLON from '@babylonjs/core'
import * as GUI from "@babylonjs/gui";

const EXTRUSION_SPEED = 2;
const CUBE_COLOR = new BABYLON.Color3(0,123,255);
const CUBE_TRANSPARENT_COLOR = new BABYLON.Color4(1, 1, 1, 0.4);
const HOVER_COLOR = BABYLON.Color3.Blue();
const GHOST_COLOR = HOVER_COLOR;

function CreateScene(engine){
    const scene = new BABYLON.Scene(engine);    
    return scene
}

function CreateCube(scene){
    const cubeProperties = {
        size:1,
        updatable:true
    }
    const cube = new BABYLON.MeshBuilder.CreateBox('cube',cubeProperties,scene);
    var material = new BABYLON.StandardMaterial("materialName", scene);
    material.diffuseColor = CUBE_COLOR;
    cube.material = material;
    return cube
}

function RenderScene(engine, scene){
    window.addEventListener("resize", function () {
        engine.resize();
      });
      // Run the render loop
      engine.runRenderLoop(() => {
        scene.render();
      });
}   

function Extrusion() {
    
    const canvasRef = useRef(null)
    
    useEffect(() => {
        const canvas = canvasRef.current
        const engine = new BABYLON.Engine(canvas);
        const scene = CreateScene(engine);
        const cube = CreateCube(scene);
        const camera = new BABYLON.ArcRotateCamera(
            "camera",
            0,
            0,
            10,
            cube.position,
            scene
          );
    
        camera.setPosition(new BABYLON.Vector3(0, 0, 5));
        camera.attachControl(canvas, true);
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        
        //scene rendering with auto scaling
        RenderScene(engine, scene);
    },[])

    return (
        <div>
            <canvas ref = {canvasRef} style={{overflow:'hidden',margin: 0, padding:0,width:"100%", height:"100%"}}></canvas>
        </div>
    )
}

export default Extrusion;