
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

function matchExample(matchResult, text, example, exampleResult) {
  var start = matchResult.match.index;
  var stop = matchResult.match.index + matchResult.match[0].length;
  var textBefore = text.slice(0, start);
  var textMatch = text.slice(start, stop);
  var textAfter = text.slice(stop, text.length);

  example.innerHTML = "";
  example.appendChild(nomatchTextElement(textBefore));
  example.appendChild(matchTextElement(textMatch));
  example.appendChild(nomatchTextElement(textAfter));

  if (!matchResult.isIncomplete) {
    example.classList.remove("incompletematch");
    example.classList.add("match");
  } else {
    example.classList.remove("match");
    example.classList.add("incompletematch");
  }

  if (exampleResult) {
    exampleResult.innerText = matchResult.textReplaced

    if (matchResult.replaceWithMatches == null || matchResult.replaceWithMatches) {
      exampleResult.classList.remove("noreplacewithmatch");
    } else if (matchResult.replaceWithMatches === false) {
      exampleResult.classList.add("noreplacewithmatch");
    }
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

function watchExpression(playfield, examples, exampleResults, regex, replaceWith, message) {
  function getExpression(flags) {
    try {
      return RegExp(regex.value, flags);
    } catch (err){
      message.innerHTML = translateErrorMessage(err.message);
      regex.classList.add("error");
      message.classList.add("error");
      return null;
    }
  }
  function getReferenceRegex(flags) {
    var reference = regex.getAttribute("reference");
    if (!reference)
      return null;

    try {
      return RegExp(reference, flags);
    } catch (err) {
      message.innerHTML = translateReferenceWrongErrorMessage(err.message);
      return null;
    }
  }
  function getReferenceInfo() {
    var reference = regex.getAttribute("reference");
    return {
      "shouldMatchWholeLine": reference.startsWith('^') && reference.endsWith('$'),
      "regex": getReferenceRegex("")
    };
  }
  function getReferenceReplaceWith() {
    return replaceWith?.getAttribute("reference");
  }
  function check() {
    updateExperiment();
    playfield.classList.remove("success");
    var referenceInfo = getReferenceInfo();
    var referenceReplaceWith = getReferenceReplaceWith();

    var exp = getExpression("");
    if (!exp || !referenceInfo ) {
      return;
    }
    message.innerHTML = "";
    regex.classList.remove("error");
    message.classList.remove("error");
    var example_list = examples.getElementsByTagName("li");
    var exampleResult_list = exampleResults?.getElementsByTagName("li");
    var allCorrect = true;
    for (var i = 0; i < example_list.length; i += 1) {
      var example = example_list[i];

      // auto create exampleResult list item when exampleResults list is present
      var exampleResult = null;
      if (exampleResults) {
        if (i >= exampleResult_list.length) {
          exampleResult = document.createElement("li");
          exampleResults.appendChild(exampleResult);
        } else {
          exampleResult = exampleResult_list[i];
        }

        exampleResult.innerText = example.innerText;
      }

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
      var isIncomplete = false;
      if (match) {
        var matches = text.match(exp);
        isIncomplete =
          referenceInfo.shouldMatchWholeLine
          && matches?.length > 0 && matches[0] != text;
      }

      var replaceWithMatches = null;
      var exampleTextReplaced = "";
      if (replaceWith) {
        var globalExp = getExpression("g");
        var globalReferenceRegExp = getReferenceRegex("g");

        var exampleTextReplaced = example.innerText.replaceAll(globalExp, replaceWith.value);
        var exampleTextReplacedReference = example.innerText.replaceAll(globalReferenceRegExp, referenceReplaceWith);

         replaceWithMatches = (exampleTextReplaced == exampleTextReplacedReference);
      }

      var matchResult = {
        "match": match,
        "isIncomplete": isIncomplete,
        "replaceWithMatches": replaceWithMatches,
        "textReplaced": exampleTextReplaced
      }
      if (matchResult.match) {
        matchExample(matchResult, text, example, exampleResult);

        // enforce overall result to fail if any expected match is incomplete
        if (referenceInfo.shouldMatchWholeLine && !shouldNotMatch)
          match = match && !matchResult.isIncomplete;
      } else {
        unmatchExample(example);
      }

      allCorrect =
        allCorrect
        && !match == shouldNotMatch
        && (!replaceWith || replaceWithMatches);
    }
    if (allCorrect) {
      playfield.classList.add("success");
    }
    if (playfieldsLoaded) {
      updateRequirements();
    }
  }
  regex.onkeyup = check;
  if (replaceWith)
    replaceWith.onkeyup = check;

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
      var matchResult = {
        "match": exp.exec(text),
        "isIncomplete": false,
        "replaceWithMatches": null,
        "textReplaced": null
      }
      if (matchResult.match) {
        experiment.classList.add("match");
        matchExample(matchResult, text, content, null);
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

    var replaceWith = null;
    if (playfield.getElementsByClassName("replaceWith").length)
      replaceWith = getPlayfieldElement(playfield, i, "replaceWith");

    var examples = getPlayfieldElement(playfield, i, "examples");

    var exampleResults = null;
    if (playfield.getElementsByClassName("exampleResults").length)
      exampleResults = getPlayfieldElement(playfield, i, "exampleResults");

    var message = getPlayfieldElement(playfield, i, "message");

    watchExpression(playfield, examples, exampleResults, regex, replaceWith, message);
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
