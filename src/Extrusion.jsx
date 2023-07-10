import React, { useEffect, useRef, useState } from 'react'
import * as BABYLON from '@babylonjs/core'
import * as GUI from "@babylonjs/gui";

const NUMBER_OF_FACETS = 3;
const NUMBER_OF_FACES = 6;
const EXTRUSION_SPEED = 3;
const CUBE_COLOR = new BABYLON.Color3(0,123,255); //Dodger Blue 
const CUBE_TRANSPARENT_COLOR = new BABYLON.Color4(1, 1, 1, 0.4); //gray
const HOVER_COLOR = new BABYLON.Color3(255,255,0); //yellow

let cubeHistory = null

function CreateScene(engine){
    const scene = new BABYLON.Scene(engine);    
    return scene
}

function CreateCube(cubeHistory,scene,restoreCube=null){
    if (restoreCube){
      return restoreCube
    }

    const cubeProperties = {
        size:1,
        updatable:true
    }
    const cube = new BABYLON.MeshBuilder.CreateBox('cube',cubeProperties,scene);
    var material = new BABYLON.StandardMaterial("cubeMatrial", scene);
    cube.convertToFlatShadedMesh();
    cube.hasVertexAlpha = true;
    material.diffuseColor = CUBE_COLOR;
    cube.material = material;
    cubeHistory = cube
    return cube
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
          positions[NUMBER_OF_FACETS * indices[i] + 0] === positions[NUMBER_OF_FACETS * indices[j] + 0] &&
          positions[NUMBER_OF_FACETS * indices[i] + 1] === positions[NUMBER_OF_FACETS * indices[j] + 1] &&
          positions[NUMBER_OF_FACETS * indices[i] + 2] === positions[NUMBER_OF_FACETS * indices[j] + 2]
        ) {
          shared[indices[i]].push(indices[j]);
        }
      }
    }
    return shared;
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
    
    const [canExtrude, setCanExtrude] = useState(false);
    const [hitDetails, setHitDetails] = useState(null);
    
    const canvasRef = useRef(null)
    const hitDetailsRef = useRef()
    const canExtrudeRef = useRef()

    hitDetailsRef.current = hitDetails
    canExtrudeRef.current = canExtrude
    
    useEffect(() => {

        const convertTo3D = ({ x, y }) =>
            BABYLON.Vector3.Unproject(
            new BABYLON.Vector3(x, y, 0),
            engine.getRenderWidth(),
            engine.getRenderHeight(),
            BABYLON.Matrix.Identity(),
            scene.getViewMatrix(),
            scene.getProjectionMatrix()
        );
        
        const highlightFace = (color) => {
            const hit = scene.pick(scene.pointerX, scene.pointerY);
            if (hit.pickedMesh) {
                const face = hit.faceId / 2;
                const facet = 2 * Math.floor(face);
                var vertex;
                for (var i = 0; i < NUMBER_OF_FACES; i++) {
                    vertex = indices[NUMBER_OF_FACETS * facet + i];
                    colors[4 * vertex] = color.r;
                    colors[4 * vertex + 1] = color.g;
                    colors[4 * vertex + 2] = color.b;
                    colors[4 * vertex + 3] = color.a;
                }
                cube.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
            }
        };
        
        const ghostColor = (color) => {
            colors = Array.from({ length: positions.length }, () =>
              color.asArray()
            ).flat();
            cube.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
        };

        const createTempPlane = (facet,plane) => {
            plane = BABYLON.MeshBuilder.CreatePlane("tmp", {}, scene);
            plane.setIndices([0, 1, 2, 3, 4, 5]);
            plane.setVerticesData(
                BABYLON.VertexBuffer.PositionKind,
                indices
                .slice(NUMBER_OF_FACETS * facet, NUMBER_OF_FACETS * facet + NUMBER_OF_FACES)
                .map((i) => [...positions.slice(NUMBER_OF_FACETS * i, NUMBER_OF_FACETS * i + NUMBER_OF_FACETS)])
                .flat()
            );
            plane.setVerticesData(
                BABYLON.VertexBuffer.ColorKind,
                Array.from({ length: 6 }).fill(HOVER_COLOR.asArray()).flat()
              );
            plane.updateFacetData();
            plane.convertToFlatShadedMesh();
            return plane;
        }
        
        const canvas = canvasRef.current;
        const engine = new BABYLON.Engine(canvas);
        const scene = CreateScene(engine);
        let cube = CreateCube(cubeHistory,scene); //let because we have to dispose and re-initialize
        const camera = CreateArcCamera(cube, scene, canvas);

        new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

        var positions = cube.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        var colors = cube.getVerticesData(BABYLON.VertexBuffer.ColorKind);
        const indices = cube.getIndices(true);
        const commonIndex = getShared(indices, positions)
        //setting colors to default white if color array is undefined/null
        if (!colors) {
            var colors = new Array(4 * positions.length / NUMBER_OF_FACETS);
            colors = colors.fill(1);
        }

        var doubleClick = false
        let plane = null
        scene.onPointerDown = () => {
            const hitInfo = scene.pick(scene.pointerX, scene.pointerY);
            if (!doubleClick && hitInfo.pickedMesh){
                doubleClick=true;
                if (hitInfo.pickedMesh) {
                    ghostColor(CUBE_TRANSPARENT_COLOR);
                    highlightFace(CUBE_COLOR)
                    setCanExtrude(true);
                    if (hitInfo.pickedMesh){
                        const normal = hitInfo.getNormal();
                        const face = hitInfo.faceId/2;
                        const facet = 2 * Math.floor(face);
                        setHitDetails({
                            normal,
                            face,
                            facet,
                            pos:{
                                x:scene.pointerX,
                                y:scene.pointerY
                            }
                        });
                        plane = createTempPlane(facet, plane);
                    }
                }
            } else if (doubleClick===true) {
                plane.dispose()
                doubleClick=false;
                camera.attachControl(canvas, true);
                setCanExtrude(false);
                setHitDetails({});
                cubeHistory = cube
                console.log(cubeHistory)
            }
        }
        scene.onPointerMove = () => {
            if(hitDetailsRef.current && canExtrudeRef.current) {
                camera.detachControl();
                // extract facet, normal and positon information from hit
                const { facet, normal, pos } = hitDetailsRef.current;
                // calculate the offset from initial position
                const offset = convertTo3D({
                  x: scene.pointerX,
                  y: scene.pointerY,
                }).subtract(convertTo3D(pos));
                const vertices = Array.from(
                  new Set(
                    indices.slice(NUMBER_OF_FACETS * facet, NUMBER_OF_FACETS * facet + NUMBER_OF_FACES).reduce((prev, cur) => {
                      prev.push(cur,...commonIndex[cur]);
                      return prev;
                    },[])
                  )
                );
                // iterate over the vertices affected by the extrusion
                vertices.forEach((vertex) => {
                  // and update the vertices along their normal
                  for (let i = 0; i < NUMBER_OF_FACETS; i++) {
                    positions[NUMBER_OF_FACETS * vertex + i] +=
                      EXTRUSION_SPEED *
                      BABYLON.Vector3.Dot(offset, normal) *
                      normal.asArray()[i];
                  }
                });
                // update the vertices of the cube
                cube.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
                // update the hit info with the current pointer position
                setHitDetails({
                  ...hitDetailsRef.current,
                  pos: {
                    x: scene.pointerX,
                    y: scene.pointerY,
                  },
                });
            } else {
                ghostColor(CUBE_COLOR);
                const hit = scene.pick(scene.pointerX, scene.pointerY);
                if (hit.pickedMesh) {
                    // highlight the picked face
                    const face = hit.faceId / 2;
                    highlightFace(face, HOVER_COLOR);
                }
            }
        };

        //RESET
        const Ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        const Reset = GUI.Button.CreateSimpleButton("Reset", "Reset");

        Reset.width=1;
        Reset.heightInPixels = 100;
        Reset.horizontalAlignment = 1;
        Reset.verticalAlignment = 1;
        Reset.color = "#ffffff";
        Reset.hoverCursor = "pointer";

        Reset.onPointerClickObservable.add(() => {
            cube.dispose();
            cubeHistory = null
            cube = CreateCube(cubeHistory,scene);
            cube.position = new BABYLON.Vector3(0, 0, 0);
            positions = cube.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        })
        //UNDO
        // Undo.width=0.5;
        // Undo.heightInPixels = 100;
        // Undo.horizontalAlignment = 0;
        // Undo.verticalAlignment = 1;
        // Undo.color = "#ffffff";
        // Undo.hoverCursor = "pointer";

        // Undo.onPointerClickObservable.add(() => {
            // console.log(cubeHistory)
            // cube.dispose();
            // cube = cubeHistory;
            // cube.position.copyFrom(cubeHistory.position);
            // cube.scaling.copyFrom(cubeHistory.scaling);
            // positions = cubeHistory.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        // })

        //Add control
        Ui.addControl(Reset);
        // Ui.addControl(Undo);

        //scene rendering with auto scaling
        RenderScene(engine, scene);
    },[])

    return (
        <canvas ref = {canvasRef} ></canvas>
    )
}

export default Extrusion;