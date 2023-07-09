import React, { useEffect, useRef, useState } from 'react'
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
    cube.convertToFlatShadedMesh();
    cube.hasVertexAlpha = true;
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

function CreateArcCamera(cube, scene, canvas){
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
    return camera
}

function getShared(indices, positions) {
    const shared = Array.from({ length: indices.length }, () => []);
  
    for (let i = 0; i < indices.length; i++) {
      for (let j = 0; j < indices.length; j++) {
        if (
          positions[3 * indices[i] + 0] === positions[3 * indices[j] + 0] &&
          positions[3 * indices[i] + 1] === positions[3 * indices[j] + 1] &&
          positions[3 * indices[i] + 2] === positions[3 * indices[j] + 2]
        ) {
          shared[indices[i]].push(indices[j]);
        }
      }
    }
    return shared;
}

function Extrusion() {
    
    const canvasRef = useRef(null)
    const [canExtrude, setCanExtrude] = useState(false);
    const [hitDetails, setHitDetails] = useState({});

    
    useEffect(() => {
        const canvas = canvasRef.current;
        const engine = new BABYLON.Engine(canvas);
        const scene = CreateScene(engine);
        const cube = CreateCube(scene);
        const camera = CreateArcCamera(cube, scene, canvas);

        new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

        var positions = cube.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        var colors = cube.getVerticesData(BABYLON.VertexBuffer.ColorKind);
        const indices = cube.getIndices(true);
        const commonIndex = getShared(indices, positions)
        // console.log(commonIndex)
        //setting colors to default white if color array is undefined/null
        if (!colors) {
            var colors = new Array(4 * positions.length / 3);
            colors = colors.fill(1);
        }

        const highlightFace = (color) => {
            const hit = scene.pick(scene.pointerX, scene.pointerY);
            if (hit.pickedMesh) {
                const face = hit.faceId / 2;
                const facet = 2 * Math.floor(face);

                var facet = 2 * Math.floor(face);
                var vertex;
                for (var i = 0; i < 6; i++) {
                    vertex = indices[3 * facet + i];
                    colors[4 * vertex] = color.r;
                    colors[4 * vertex + 1] = color.g;
                    colors[4 * vertex + 2] = color.b;
                    colors[4 * vertex + 3] = color.a;
                }
                cube.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
            }
        }
        
        const ghostColor = (color) => {
            colors = Array.from({ length: positions.length }, () =>
              color.asArray()
            ).flat();
            console.log(colors)
            cube.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
          };

        const createTempPlane = (facet) => {
            const plane = BABYLON.MeshBuilder.CreatePlane("tmp", {}, scene);
            plane.setIndices([0, 1, 2, 3, 4, 5]);
            plane.setVerticesData(
                BABYLON.VertexBuffer.PositionKind,
                indices
                .slice(3 * facet, 3 * facet + 6)
                .map((i) => [...positions.slice(3 * i, 3 * i + 3)])
                .flat()
            );
            plane.setVerticesData(
                BABYLON.VertexBuffer.ColorKind,
                Array.from({ length: 6 }).fill(HOVER_COLOR.asArray()).flat()
            );
            plane.updateFacetData();
            plane.convertToFlatShadedMesh();
        }
        
        var doubleClick = false
        scene.onPointerDown = () => {
            if (doubleClick){
                doubleClick=false;
                ghostColor(CUBE_TRANSPARENT_COLOR);
                highlightFace(CUBE_COLOR)
                setCanExtrude(prevCanExtrude => !prevCanExtrude);
                const hitInfo = scene.pick(scene.pointerX, scene.pointerY);
                if (hitInfo.pickedMesh){
                    
                    const normal = hitInfo.getNormal();
                    const face = hitInfo.faceId/2;
                    const facet = 2* Math.floor(face);

                    setHitDetails({
                        normal,
                        face,
                        facet,
                        pos:{
                            x:scene.pointerX,
                            y:scene.pointerY
                        }
                    });
                    createTempPlane(facet);


                }
                
            } else {
                highlightFace(HOVER_COLOR)
                // ghostColor(CUBE_TRANSPARENT_COLOR)
                doubleClick=true
            }
        }
        


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