import "@kitware/vtk.js/favicon";
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
import vtkLiteHttpDataAccessHelper from "@kitware/vtk.js/IO/Core/DataAccessHelper/LiteHttpDataAccessHelper";

window.openTab = function (evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  document.getElementById(tabName).style.display = "block";
  if (tabName == "vtkContent") {
    renderVTKContent();
  } else {
    renderItkContent();
  }
  //const controlPanelContent = document.getElementById("");
};

function renderVTKContent() {
  const vtkContainer = document.getElementById("vtkContent");
  vtkContainer.style.width = "100vw";
  vtkContainer.style.height = "90vh";

  const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],
    container: vtkContainer,
  });

  const renderWindow = fullScreenRenderWindow.getRenderWindow();
  const renderer = fullScreenRenderWindow.getRenderer();

  //fullScreenRenderWindow.addController(controlPanel);

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
    .setUrl(`https://kitware.github.io/vtk-js/data/volume/headsq.vti`, {
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
      renderer
        .getActiveCamera()
        .set({ position: [1, 1, 1], viewUp: [0, 0, -1] });
      renderer.resetCamera();
      renderWindow.render();
    });

  //global.fullScreen = fullScreenRenderWindow;
  global.actor = actor;
  global.mapper = mapper;
  global.marchingCube = marchingCube;
}

function renderItkContent() {
  const itkContainer = document.getElementById("itkContent");
  itkContainer.style.width = "100vw";
  itkContainer.style.height = "90vh";

  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],
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

    mapper.setInputData(vtkImage);
    renderer.addVolume(actor);
    renderer.resetCamera();
    renderer.getActiveCamera().zoom(1.5);
    renderer.getActiveCamera().elevation(70);
    renderer.updateLightsGeometryToFollowCamera();
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

window.onload = renderVTKContent;
//window.onload = renderItkContent;
