
var playfieldsLoaded = false;

function translateErrorMessage(message) {
  return errorMessage + ": \"" + message + "\"";
}

function translateReferenceWrongErrorMessage(message) {
  return errorReferenceWrong + ": \"" + message + "\"";
}

function matchTextElement(string) {
  var span = document.createElement('span');
  span.innerText = string;
  span.classList.add("text-match");
  return span;
}
function nomatchTextElement(string) {
  var span = document.createElement('span');
  span.innerText = string;
  span.classList.add("text-nomatch");
  return span;
}

function matchExample(match, isIncomplete, text, example) {
  var text = example.innerText;
  var start = match.index;
  var stop = match.index + match[0].length;
  var textBefore = text.slice(0, start);
  var textMatch = text.slice(start, stop);
  var textAfter = text.slice(stop, text.length);

  example.innerHTML = "";
  example.appendChild(nomatchTextElement(textBefore));
  example.appendChild(matchTextElement(textMatch));
  example.appendChild(nomatchTextElement(textAfter));

  if (!isIncomplete) {
    example.classList.remove("incompletematch");
    example.classList.add("match");
  } else {
    example.classList.remove("match");
    example.classList.add("incompletematch");
  }

  example.classList.remove("nomatch");
}

function unmatchExample(example) {
  var text = example.innerText;
  example.innerHTML = "";
  example.appendChild(nomatchTextElement(text));
  example.classList.remove("incompletematch");
  example.classList.remove("match");
  example.classList.add("nomatch");
}

function watchExpression(playfield, examples, regex, message) {
  function getExpression() {
    try {
      return RegExp(regex.value);
    } catch (err){
      message.innerHTML = translateErrorMessage(err.message);
      regex.classList.add("error");
      message.classList.add("error");
      return null;
    }
  }
  function getReferenceInfo() {
    var reference = regex.getAttribute("reference");
    try {
      return {
        "shouldMatchWholeLine": reference.startsWith('^') && reference.endsWith('$'),
        "regex": RegExp(reference)
      };
    } catch (err) {
      message.innerHTML = translateReferenceWrongErrorMessage(err.message);
      return null;
    }
  }
  function check() {
    updateExperiment();
    playfield.classList.remove("success");
    var referenceInfo = getReferenceInfo();
    var exp = getExpression();
    if (!exp || !referenceInfo) {
      return;
    }
    message.innerHTML = "";
    regex.classList.remove("error");
    message.classList.remove("error");
    var example_list = examples.getElementsByTagName("li");
    var allCorrect = true;
    for (var i = 0; i < example_list.length; i += 1) {
      var example = example_list[i];
      var text = example.innerText;
      // determine if it should match
      var shouldNotMatch;
      if (!referenceInfo.shouldMatchWholeLine) {
        shouldNotMatch = referenceInfo.regex.exec(text) ? false : true;
      } else {
        var matches = text.match(referenceInfo.regex);
        shouldNotMatch =  matches?.length > 0 && matches[0] == text ? false : true;
      }
      if (shouldNotMatch) {
        example.classList.add("fail");
        example.classList.remove("ok");
      } else {
        example.classList.remove("fail");
        example.classList.add("ok");
      }
      // check the match
      var match = exp.exec(text);
      if (match) {
        var matches = text.match(exp);
        var isIncomplete =
          referenceInfo.shouldMatchWholeLine
          && matches?.length > 0 && matches[0] != text;

        matchExample(match, isIncomplete, text, example);

        // enforce overall result to fail if any expected match is incomplete
        if (referenceInfo.shouldMatchWholeLine && !shouldNotMatch)
          match = match && !isIncomplete;
      } else {
        unmatchExample(example);
      }
      allCorrect = !match == shouldNotMatch && allCorrect;
    }
    if (allCorrect) {
      playfield.classList.add("success");
    }
    if (playfieldsLoaded) {
      updateRequirements();
    }
  }
  regex.onkeyup = check;

  var experiments = playfield.getElementsByClassName("experiment");
  if (experiments.length == 1) {
    var experiment = experiments[0];
    var content = document.createElement("div");
    content.classList.add("content");
    var textField = document.createElement("input");
    textField.type = "text";
    experiment.appendChild(textField);
    experiment.appendChild(content);
    function updateExperiment() {
      experiment.classList.remove("match");
      experiment.classList.remove("nomatch");
      var text = textField.value;
      content.innerText = text;
      var exp = getExpression();
      if (!exp) {
        return;
      }
      var match = exp.exec(text);
      if (match) {
        experiment.classList.add("match");
        matchExample(match, false, text, content);
      } else {
        experiment.classList.add("nomatch");
        unmatchExample(content);
      }
    }
    experiment.onkeyup = updateExperiment;
  } else {
    function updateExperiment() {}
  }
  check();
  required(function() {
    return playfield.classList.contains("success");
  });
}

function getPlayfieldElement(playfield, index, name) {
  var playfieldElements = playfield.getElementsByClassName(name);
  if (playfieldElements.length != 1) {
    alert("ERROR: Field number " + index + " must have one '" + name + "' field.");
  }
  return playfieldElements[0];
}

function loadPlayfields(){
  if (playfieldsLoaded) {
    return;
  }
  var playfields = document.getElementsByClassName("playfield");
  for (var i = 0; i < playfields.length; i += 1) {
    var playfield = playfields[i];
    var regex = getPlayfieldElement(playfield, i, "regex");
    var examples = getPlayfieldElement(playfield, i, "examples");
    var message = getPlayfieldElement(playfield, i, "message");

    watchExpression(playfield, examples, regex, message);
    if (i == 0) {
      regex.focus();
    }
  }
  playfieldsLoaded = true;
}
window.addEventListener("load", loadPlayfields);

window.addEventListener("keypress", function(event){
  if (event.which === 13 || event.keyCode === 13) {
    var next = document.getElementsByClassName("next-page")[0].href;
    if (!(undefined === next || !next || next.length === 0)) {
      window.location.href = next;
    }
    return false;
  }
  return true;
});
