import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/Volume";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkHttpDataSetReader from "@kitware/vtk.js/IO/Core/HttpDataSetReader";
import vtkImageMarchingCubes from "@kitware/vtk.js/Filters/General/ImageMarchingCubes";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import "@kitware/vtk.js/Rendering/Profiles/Volume";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkITKHelper from "@kitware/vtk.js/Common/DataModel/ITKHelper";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkLiteHttpDataAccessHelper from "@kitware/vtk.js/IO/Core/DataAccessHelper/LiteHttpDataAccessHelper";

window.openDialog = function (evt) {
  document.getElementById("info").style.display = "block";
};

window.closeDialog = function () {
  document.getElementById("info").style.display = "none";
};

window.openTab = function (evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  document.getElementById(tabName).style.display = "block";
  if (tabName == "vtkContent") {
    renderVTKContent();
  } else if (tabName == "itkContent") {
    renderItkContent();
  } else {
    renderPolyContent();
  }
  const controlPanelContent = document.getElementsByClassName("control-panel");
  for (let i = 0; i < controlPanelContent.length; i++) {
    if (controlPanelContent[i]) {
      controlPanelContent[i].style.display = "none";
    }
  }
  const controlPanelElement = document.getElementById(
    tabName + "_controlPanel"
  );
  if (controlPanelElement) {
    controlPanelElement.style.display = "block";
  }

  var dialogTitle = document.getElementById("dialogTitle");
  var dialogContent = document.getElementById("dialogContent");
  switch (tabName) {
    case "vtkContent":
      dialogTitle.innerText = "Volume Contour Rendering";
      dialogContent.innerText =
        "VolumeContour focuses on visualizing volumetric data by representing isocontours, which are surfaces of constant scalar value within the volume";
      break;
    case "itkContent":
      dialogTitle.innerText = "ITK WASM Volume";
      dialogContent.innerText =
        "ItkWasmVolume utilizes the Insight Segmentation and Registration Toolkit (ITK) for volume visualization in web applications. ";
      break;
    case "polyContent":
      dialogTitle.innerText = "Volume Rendering With PolyData";
      dialogContent.innerText =
        "Volume rendering with polydata involves the direct visualization of volumetric data without the need for intermediate surface extraction.";
      break;
    default:
      break;
  }
};

function renderVTKContent() {
  const vtkContainer = document.getElementById("vtkContent");
  vtkContainer.style.width = "100vw";
  vtkContainer.style.height = "90vh";

  const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0.3, 0.3],
    container: vtkContainer,
  });

  const renderWindow = fullScreenRenderWindow.getRenderWindow();
  const renderer = fullScreenRenderWindow.getRenderer();

  const actor = vtkActor.newInstance();
  const mapper = vtkMapper.newInstance();
  const marchingCube = vtkImageMarchingCubes.newInstance({
    contourValue: 0.0,
    computeNormals: true,
    mergePoints: true,
  });

  actor.setMapper(mapper);
  mapper.setInputConnection(marchingCube.getOutputPort());

  function updateIsoValue(e) {
    const isoValue = Number(e.target.value);
    marchingCube.setContourValue(isoValue);
    renderWindow.render();
  }

  const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
  marchingCube.setInputConnection(reader.getOutputPort());

  reader
    .setUrl("https://kitware.github.io/vtk-js/data/volume/headsq.vti", {
      loadData: true,
    })
    .then(() => {
      const data = reader.getOutputData();
      const dataRange = data.getPointData().getScalars().getRange();
      const firstIsoValue = (dataRange[0] + dataRange[1]) / 3;

      const el = document.querySelector(".isoValue");
      el.setAttribute("min", dataRange[0]);
      el.setAttribute("max", dataRange[1]);
      el.setAttribute("value", firstIsoValue);
      el.addEventListener("input", updateIsoValue);

      marchingCube.setContourValue(firstIsoValue);
      renderer.addActor(actor);
      renderer.getActiveCamera().zoom(1);
      renderer
        .getActiveCamera()
        .set({ position: [0, 1, 0], viewUp: [0, 0, -1] });
      renderer.resetCamera();
      renderWindow.render();
      const abcdata = reader.getOutputData(); // Assuming the data is a polydata
      console.log("Number of vertices:", abcdata.getNumberOfPoints());
      console.log("Bounds:", abcdata.getBounds());
      console.log("Dimensions:", abcdata.getDimensions());
    })
    .catch((error) => {
      console.error("Error loading VTI file:", error);
    });
  global.actor = actor;
  global.mapper = mapper;
  global.marchingCube = marchingCube;
}

function renderItkContent() {
  const itkContainer = document.getElementById("itkContent");
  itkContainer.style.width = "100vw";
  itkContainer.style.height = "90vh";

  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0.3, 0.3],
    container: itkContainer,
  });
  const renderer = fullScreenRenderer.getRenderer();
  const renderWindow = fullScreenRenderer.getRenderWindow();

  const actor = vtkVolume.newInstance();
  const mapper = vtkVolumeMapper.newInstance();
  mapper.setSampleDistance(0.7);
  actor.setMapper(mapper);

  const ctfun = vtkColorTransferFunction.newInstance();
  ctfun.addRGBPoint(200.0, 0.4, 0.5, 0.0);
  ctfun.addRGBPoint(2000.0, 1.0, 1.0, 1.0);
  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(200.0, 0.0);
  ofun.addPoint(120.0, 0.3);
  ofun.addPoint(300.0, 0.6);
  actor.getProperty().setRGBTransferFunction(0, ctfun);
  actor.getProperty().setScalarOpacity(0, ofun);
  actor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
  actor.getProperty().setInterpolationTypeToLinear();
  actor.getProperty().setUseGradientOpacity(0, true);
  actor.getProperty().setGradientOpacityMinimumValue(0, 15);
  actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  actor.getProperty().setGradientOpacityMaximumValue(0, 100);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setShade(true);
  actor.getProperty().setAmbient(0.2);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);

  async function update() {
    const volumeArrayBuffer = await vtkLiteHttpDataAccessHelper.fetchBinary(
      `https://data.kitware.com/api/v1/file/5d2a36ff877dfcc902fae6d9/download`
    );
    const { readImage } = await import(
      /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@itk-wasm/image-io@1.1.0/dist/bundle/index-worker-embedded.min.js"
    );

    const { image: itkImage, webWorker } = await readImage({
      data: new Uint8Array(volumeArrayBuffer),
      path: "knee.mha",
    });
    webWorker.terminate();

    const vtkImage = vtkITKHelper.convertItkToVtkImage(itkImage);

    console.log("Dimensions:", vtkImage.getDimensions());
    // You can log other properties like spacing, origin, etc.
    console.log("Spacing:", vtkImage.getSpacing());
    const dimensions = itkImage.size;
    const numberOfVoxels = dimensions[0] * dimensions[1] * dimensions[2];
    console.log("Number of Voxels:", numberOfVoxels);

    mapper.setInputData(vtkImage);
    renderer.addVolume(actor);
    renderer.resetCamera();
    renderer.getActiveCamera().zoom(1);
    renderer.getActiveCamera().elevation(70);
    renderer.updateLightsGeometryToFollowCamera();
    renderer.getActiveCamera().set({ position: [0, 1, 0], viewUp: [0, 0, -1] });
    renderer.resetCamera();
    renderWindow.render();
  }
  update();
  global.mapper = mapper;
  global.actor = actor;
  global.ctfun = ctfun;
  global.ofun = ofun;
  global.renderer = renderer;
  global.renderWindow = renderWindow;
}

function renderPolyContent() {
  const polyContainer = document.getElementById("polyContent");
  polyContainer.style.width = "100vw";
  polyContainer.style.height = "90vh";

  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0.3, 0.3],
    container: polyContainer,
  });

  //fullScreenRenderer.addController(controlPanel);

  const clipPlane1 = vtkPlane.newInstance();
  const clipPlane2 = vtkPlane.newInstance();
  let clipPlane1Position = 0;
  let clipPlane2Position = 0;
  const clipPlane1Normal = [-1, 1, 0];
  const clipPlane2Normal = [0, 0, 1];

  function getSphereActor({
    center,
    radius,
    phiResolution,
    thetaResolution,
    opacity,
  }) {
    const sphereSource = vtkSphereSource.newInstance({
      center,
      radius,
      phiResolution,
      thetaResolution,
    });
    sphereSource.setCenter(center);

    const actor = vtkActor.newInstance();
    const mapper = vtkMapper.newInstance();

    actor.getProperty().setOpacity(opacity);

    mapper.setInputConnection(sphereSource.getOutputPort());
    actor.setMapper(mapper);

    const polyData = sphereSource.getOutputData();
    const data = polyData.getPoints().getData();

    return { actor, data, mapper };
  }

  const { actor: cubeActor, mapper: sphereMapper } = getSphereActor({
    center: [125, 125, 200],
    radius: 50,
    phiResolution: 30,
    thetaResolution: 30,
    opacity: 1,
    edgeVisibility: true,
  });

  cubeActor.setMapper(sphereMapper);

  const actor = vtkVolume.newInstance();
  const mapper = vtkVolumeMapper.newInstance({
    sampleDistance: 1.1,
  });

  const renderer = fullScreenRenderer.getRenderer();
  const renderWindow = fullScreenRenderer.getRenderWindow();

  //renderer.addActor(cubeActor);

  const ctfun = vtkColorTransferFunction.newInstance();
  ctfun.addRGBPoint(0, 85 / 255.0, 0, 0);
  ctfun.addRGBPoint(95, 1.0, 1.0, 1.0);
  ctfun.addRGBPoint(225, 0.66, 0.66, 0.5);
  ctfun.addRGBPoint(255, 0.3, 1.0, 0.5);
  const ofun = vtkPiecewiseFunction.newInstance();
  ofun.addPoint(0.0, 0.0);
  ofun.addPoint(255.0, 1.0);
  actor.getProperty().setRGBTransferFunction(0, ctfun);
  actor.getProperty().setScalarOpacity(0, ofun);
  actor.getProperty().setScalarOpacityUnitDistance(0, 3.0);
  actor.getProperty().setInterpolationTypeToLinear();
  actor.getProperty().setUseGradientOpacity(0, true);
  actor.getProperty().setGradientOpacityMinimumValue(0, 2);
  actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
  actor.getProperty().setGradientOpacityMaximumValue(0, 20);
  actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
  actor.getProperty().setShade(true);
  actor.getProperty().setAmbient(0.2);
  actor.getProperty().setDiffuse(0.7);
  actor.getProperty().setSpecular(0.3);
  actor.getProperty().setSpecularPower(8.0);

  const reader = vtkHttpDataSetReader.newInstance({
    fetchGzip: true,
  });

  actor.setMapper(mapper);
  mapper.setInputConnection(reader.getOutputPort());

  reader
    .setUrl("https://kitware.github.io/vtk-js/data/volume/LIDC2.vti")
    .then(() => {
      reader.loadData().then(() => {
        const data = reader.getOutputData();
        const extent = data.getExtent();
        const spacing = data.getSpacing();

        const sizeX = extent[1] * spacing[0];
        const sizeY = extent[3] * spacing[1];

        const clipPlane1Origin = [
          clipPlane1Position * clipPlane1Normal[0],
          clipPlane1Position * clipPlane1Normal[1],
          clipPlane1Position * clipPlane1Normal[2],
        ];
        const clipPlane2Origin = [
          clipPlane2Position * clipPlane2Normal[0],
          clipPlane2Position * clipPlane2Normal[1],
          clipPlane2Position * clipPlane2Normal[2],
        ];

        clipPlane1.setNormal(clipPlane1Normal);
        clipPlane1.setOrigin(clipPlane1Origin);
        clipPlane2.setNormal(clipPlane2Normal);
        clipPlane2.setOrigin(clipPlane2Origin);

        mapper.addClippingPlane(clipPlane1);
        mapper.addClippingPlane(clipPlane2);

        sphereMapper.addClippingPlane(clipPlane1);
        sphereMapper.addClippingPlane(clipPlane2);

        renderer.addVolume(actor);
        renderer
          .getActiveCamera()
          .set({ position: [0, 1, 0], viewUp: [0, 0, -1] });
        renderer.resetCamera();

        renderWindow.render();

        let el = document.querySelector(".plane1Position");
        el.setAttribute("min", -sizeX);
        el.setAttribute("max", sizeX);
        el.setAttribute("value", clipPlane1Position);

        el = document.querySelector(".plane2Position");
        el.setAttribute("min", -sizeY);
        el.setAttribute("max", sizeY);
        el.setAttribute("value", clipPlane2Position);
      });
    });

  // TEST PARALLEL ==============

  let isParallel = false;
  const button = document.querySelector(".text");

  function toggleParallel() {
    isParallel = !isParallel;
    const camera = renderer.getActiveCamera();
    camera.setParallelProjection(isParallel);

    renderer.resetCamera();

    button.innerText = `(${isParallel ? "on" : "off"})`;

    renderWindow.render();
  }

  document.querySelector(".plane1Position").addEventListener("input", (e) => {
    clipPlane1Position = Number(e.target.value);
    const clipPlane1Origin = [
      clipPlane1Position * clipPlane1Normal[0],
      clipPlane1Position * clipPlane1Normal[1],
      clipPlane1Position * clipPlane1Normal[2],
    ];

    clipPlane1.setOrigin(clipPlane1Origin);
    renderWindow.render();
  });

  document.querySelector(".plane2Position").addEventListener("input", (e) => {
    clipPlane2Position = Number(e.target.value);

    const clipPlane2Origin = [
      clipPlane2Position * clipPlane2Normal[0],
      clipPlane2Position * clipPlane2Normal[1],
      clipPlane2Position * clipPlane2Normal[2],
    ];

    clipPlane2.setOrigin(clipPlane2Origin);
    renderWindow.render();
  });

  const data_poly = reader.getOutputData();
  const numberOfVertices = data_poly.getBounds();
  const numberOfPoints = data_poly.getPoints().getNumberOfPoints();
  console.log("Number of vertices:", numberOfPoints);

  console.log("Bounds:", numberOfVertices);

  global.source = reader;
  global.mapper = mapper;
  global.actor = actor;
  global.renderer = renderer;
  global.renderWindow = renderWindow;
  global.toggleParallel = toggleParallel;
}

window.onload = renderVTKContent;
