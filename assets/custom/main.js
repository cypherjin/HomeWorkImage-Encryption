var planeNo = 0;
var inputBytes = false;

function handleFileSelect(evt) {
  /*
  Live file reader management.
  Loaded image object is sent to the run() function.
  */

  //Reset current settings
  inputBytes = false;
  $("#image").html("");

  var f = evt.target.files[0];
  $("#filename").val(f.name);
  if (!f.type.match('image.*')) {
    alert("Please enter valid image file.");
    return;
  }

  //Show controls
  $(".notdata").removeClass("d-none");

  //Read file
  var reader = new FileReader();
  reader.readAsDataURL(f);

  reader.onloadend = function(){
    let imageObj = new Image();
    imageObj.onload = function() {
      run(imageObj, this.width, this.height, reader.result);
    }
    imageObj.src = reader.result;
  }

}
document.getElementById('files').addEventListener('change', handleFileSelect, false);


function hideDataFileReader(evt) {
  /*
    Live file reader management for the file input when hiding data inside of images.
    Sets the image data to global var: inputBytes
  */
  var file = evt.target.files[0];
  $("#hidefilename").val(file.name);

  //Read file
  var bytereader = new FileReader();

  bytereader.onloadend = function(){
    inputBytes = new Uint8Array(this.result);
    inputBytes = Array.from(inputBytes).map(c => String.fromCharCode(c));
  }
  bytereader.readAsArrayBuffer(this.files[0]);

}
document.getElementById('hidefile').addEventListener('change', hideDataFileReader, false);


function hideImageFileReader(evt) {
  /*
    Live file reader management for the file input when hiding images inside of images.
    Sets global vars: hideR, hideG, hideB, hideA
  */
  var f = evt.target.files[0];
  $("#hideimagefilename").val(f.name);

  if (!f.type.match('image.*')) {
    alert("Please enter valid image file.");
    return;
  }

  //Read file
  var reader = new FileReader();
  reader.readAsDataURL(f);

  reader.onloadend = function(){
    let imageObj = new Image();
    imageObj.onload = function() {
      var tempcanvas = document.createElement("canvas");
      var tempctx = tempcanvas.getContext("2d");
      tempctx.imageSmoothingEnabled = false;
      tempcanvas.width = this.width;
      tempcanvas.height = this.height;
      tempctx.drawImage(imageObj, 0, 0);
      temprgbaData = tempctx.getImageData(0, 0, this.width, this.height).data;
      hideR = temprgbaData.filter((val, index) => index % 4 == 0);
      hideG = temprgbaData.filter((val, index) => (index-1) % 4 == 0);
      hideB = temprgbaData.filter((val, index) => (index-2) % 4 == 0);
      hideA = new Array(r.length).fill(255);
      hideWidth = this.width;
      hideHeight = this.height;
      $(".hideBitPlaneOptions").removeClass("d-none");
    }
    imageObj.src = reader.result;
  }

}
document.getElementById('hideimagefile').addEventListener('change', hideImageFileReader, false);


function run(imageObj, width, height, src) {
  /*
    Main control function
    Input: Image object, image width, image height
    If image has transparency, run seperate function
    If not, display image control features.
  */
  //Initialise canvas
  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  canvas.width = width;
  canvas.height = height;

  //Get image data
  ctx.drawImage(imageObj, 0, 0);
  rgbaData = ctx.getImageData(0, 0, width, height).data;
  a = rgbaData.filter((val, index) => (index-3) % 4 == 0); //Get just alpha values

  //If image has transparency, we must use pngtoy to correctly load RGB values
 if (a.filter(_ => _ < 255).length > 0) {
   let pngtoyObj = new PngImage();
   pngtoyObj.onload = function() {
     runTransparent(pngtoyObj, src);
   }
   pngtoyObj.src = src;
   return;
 }

  //Get RGB values
  r = rgbaData.filter((val, index) => index % 4 == 0);
  g = rgbaData.filter((val, index) => (index-1) % 4 == 0);
  b = rgbaData.filter((val, index) => (index-2) % 4 == 0);
  restore();
  isTransparent = false;
  $("#image").append(canvas);

}

async function runTransparent(pngtoyObj) {
  /*
    A child function of run(), for images with transparency.
    Since it's impossible to read the correct RGB values of transparent images in JS, we use pngtoy to find them
    Input:
      -A loaded PngImage from pngtoy
  */
  pngtoyObj = pngtoyObj.pngtoy;
  pngData = await pngtoyObj.decode();
  rgbaData = pngData.bitmap;
  r = rgbaData.filter((val, index) => index % 4 == 0);
  g = rgbaData.filter((val, index) => (index-1) % 4 == 0);
  b = rgbaData.filter((val, index) => (index-2) % 4 == 0);
  a = rgbaData.filter((val, index) => (index-3) % 4 == 0);
  isTransparent = true;
  restore();
  $("#image").append(canvas);
}


function restore() {
  /*
    Uses global r, g, b & a constants.
    Draws regular loaded image onto canvas, and resets RGBA planes
  */
  planeNo = 0;
  $(".bitbutton").addClass("d-none");
  $("#browseplanetext").text("");
  $("#planesbtn").removeClass("d-none");
  $("#browseplanefield").addClass("d-none");
  generateImage(r, g, b, a);
}


function initPlanes() {
  /*
    Shows the planes viewer, and displays the initial plane.
  */
  $("#planesbtn").addClass("d-none");
  $(".bitbutton").removeClass("d-none");
  $("#browseplanefield").removeClass("d-none");

  let transformKeys = Object.keys(transforms);
  $("#browseplanetext").html(transformKeys[planeNo]);
  displayPlane(...transforms[transformKeys[planeNo]]);
}


function browsePlanes(action, direction) {
  /*
    Used to traverse the RGBA plane viewer.
    Input:
      - action ('next' or 'skip'): Go to next plane, or skip to next colour
      - direction ('forward' or 'backward'): Traverse forwards or backwards
  */
  if (action == 'next') {
    planeNo += (direction == 'forward' ? 1 : -1);
    if (planeNo > 31) planeNo = 0;
    else if (planeNo > 23 && !isTransparent) planeNo = 0;
    else if (planeNo < 0 && isTransparent) planeNo = 31;
    else if (planeNo < 0 && !isTransparent) planeNo = 23;
  }
  else if (action == 'skip') {
    if (direction == 'forward') {
      if (planeNo >= 24) planeNo = 0;
      else if (planeNo >= 16 && isTransparent) planeNo = 24;
      else if (planeNo >= 16 && !isTransparent) planeNo = 0;
      else if (planeNo >= 8) planeNo = 16;
      else if (planeNo >= 0) planeNo = 8;
    }
    else if (direction == 'backward') {
      if (planeNo >= 24) planeNo = 16;
      else if (planeNo >= 16) planeNo = 8;
      else if (planeNo >= 8) planeNo = 0;
      else if (planeNo >= 0 && isTransparent) planeNo = 24;
      else if (planeNo >= 0 && !isTransparent) planeNo = 16;
    }
  }

  let transformKeys = Object.keys(transforms);
  $("#browseplanetext").html(transformKeys[planeNo]);
  displayPlane(...transforms[transformKeys[planeNo]]);
}

function back() {
  /*
    Hides the embedextract menu/hide image menu and shows the main page again.
  */
  $("#dataEmbedExtract").addClass("d-none");
  $(".extractOnly").addClass("d-none");
  $(".embedOnly").addClass("d-none");
  $("#hideImage").addClass("d-none");
  $("#extractbtn").prop("disabled", false);
  $("#embedbtn").prop("disabled", false);
  $(".notdata").removeClass("d-none");
  $("#image").removeClass("d-none");
  $("#back").addClass("d-none");
  $("#hideImageUpload").addClass("d-none");
}

function openEmbedExtract(type) {
  /*
    Prepares the data extraction menu.
    Input: either 'embed' or 'extract'
  */
  //Standard table stuff
  $(".notdata").addClass("d-none");
  $("#image").addClass("d-none");
  $("#dataEmbedExtract").removeClass("d-none");
  $(".extractOnly").addClass("d-none");
  $(".embedOnly").addClass("d-none");
  $("#back").removeClass("d-none");
  //Extract specific stuff
  if (type == 'extract') $(".extractOnly").removeClass("d-none");
  else if (type == 'embed') $(".embedOnly").removeClass("d-none"), $("#extractorembed").text("Embed Data");
  else throw "Invalid Type. Only 'extract' or 'embed' accepted.";
}

function openHideImage() {
  /*
    Opens the Image Hiding menu
  */
  $(".notdata").addClass("d-none");
  $("#image").addClass("d-none");
  $("#hideImage").removeClass("d-none");
  $("#back").removeClass("d-none");
}

function parseTable() {
  /*
    Parses the EmbedExtract table for use in their respective lsb functions.
  */
  var table = $("#lsbtable")[0];
  var lsbParams = {};
  var columns = ['','R','G','B','A'];

  //1) Find bit planes from table
  var totalBits = {};
  for (let i=1; i < 5; i++) { //For each column
    let selectedBits = [];
    for (let j=1; j < table.rows.length; j++) { //For each row
      var checked = table.rows.item(j).cells[i].childNodes[0].childNodes[0].checked;
      if (checked) selectedBits.push(8-j); //Push checked bits into array
    }
    //If bits selected, push to array
    if (selectedBits.length > 0) {
      totalBits[columns[i]] = selectedBits;
    }
  }
  if (Object.keys(totalBits).length == 0) {
    $("#lsbStatus").removeClass("d-none");
    $("#statusText").html("No bits selected in table.");
    $("#embedbtn").prop("disabled", false);
    $("#extractbtn").prop("disabled", false);
    return;
  }

  //2) Pixel order
  lsbParams['pixelOrder'] = $("#pixelOrderRow").is(":checked") ? 'row' : 'column';
  //3) Bit order
  lsbParams['bitOrder'] = $("#bitOrderMSB").is(":checked") ? 'msb' : 'lsb';
  //Get bit plane order
  var planeOrder = [$("#rgbaOne").val(),$("#rgbaTwo").val(),$("#rgbaThree").val(),$("#rgbaFour").val()];
  let sorted = planeOrder.slice(0).sort();
    //Check for errors
  if (sorted[0] != "A" || sorted[1] != "B" || sorted[2] != "G" || sorted[3] != "R") {
    $("#lsbStatus").removeClass("d-none");
    $("#statusText").html("Duplicate colours in Bit Plane Order.");
    $("#embedbtn").prop("disabled", false);
    $("#extractbtn").prop("disabled", false);
    return;
  }
  lsbParams['selectedBits'] = [];
  lsbParams['selectedColours'] = [];
  for (colour of planeOrder) {
    if (totalBits[colour] == undefined) continue;
    if (colour == 'R' && totalBits) lsbParams['selectedColours'].push(r);
    if (colour == 'G' && totalBits) lsbParams['selectedColours'].push(g);
    if (colour == 'B' && totalBits) lsbParams['selectedColours'].push(b);
    if (colour == 'A' && totalBits) lsbParams['selectedColours'].push(a);
    lsbParams['selectedBits'].push(totalBits[colour]);
  }

  //4) Text input
  lsbParams['textInput'] = $("#textinput").val();
  //5) File input - from global var declared within hideFileRead()
  if (inputBytes) lsbParams['byteInput'] = inputBytes;
  else lsbParams['byteInput'] = false;

  $("#statusText").html("");
  $("#lsbStatus").addClass("d-none");
  return lsbParams;
}


async function startExtract() {
  /*
    Controller for the extraction process.
  */
  $("#extractbtn").prop("disabled", true);
  var tableData = parseTable();
  var hexResult = await extractlsb(tableData['selectedColours'], tableData['selectedBits'], tableData['pixelOrder'], tableData['bitOrder']);
  var asciiResult = hexToAscii(hexResult).match(/.{1,8}/g).join(' ');
  $("#hexoutput").val(hexResult);
  $("#asciioutput").val(asciiResult);
  $("#extractbtn").prop("disabled", false);
}


async function startEmbed() {
  /*
  Controller for the embed process.
  */
  $("#embedbtn").prop("disabled", true);
  var tableData = parseTable();
  //Remove alpha
  if (tableData['selectedColours'].indexOf(a) != -1) {
    tableData['selectedBits'][tableData['selectedColours'].indexOf(a)] = [];
  }
  var toHide = textToBin(tableData['textInput']);
  if (tableData['byteInput']) toHide = textToBin(tableData['byteInput']);
  //Check if enough space
  let selectedLength = [].concat.apply([], tableData['selectedBits']).length;
  let minimumRequired = Math.ceil(toHide.length / r.length);
  if (selectedLength < minimumRequired) {
    $("#lsbStatus").removeClass("d-none");
    if (minimumRequired < 21) $("#statusText").html("Not enough space to fit data. Please select at least "+minimumRequired+" bits in table.<br/>Cropping at "+selectedLength*r.length+" bits.");
    else $("#statusText").html("Data too large!<br/>Cropping at "+selectedLength*r.length+" bits.");
    // $("#statusText").html("Not enough space to fit data... Cropping after "+selectedLength+" bits.");
  }
  await hidelsb(toHide, tableData['selectedColours'], tableData['selectedBits'], tableData['pixelOrder'], tableData['bitOrder']);
  $("#embedbtn").prop("disabled", false);
  $("#image").removeClass("d-none");
}


function embedImageInImage() {
  /*
    Parses options in "Embed Image in Bit Plane" page, and calls the hideImageInBitPlane function with the relevant parameters.
  */
  var plane = $("#hideBitPlanePlane").val();
  var bit = parseInt($("#hideBitPlaneBit").val());
  hideImageInBitPlane(plane, bit);
  $("#image").removeClass("d-none");
}
