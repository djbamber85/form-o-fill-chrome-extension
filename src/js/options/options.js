/*global $, JSONEditor, ace, RuleStorage, Utils, Rules, Rule, I18n, ChromeBootstrap, Editor */
/*eslint max-nested-callbacks: 0*/
// This file is a big bag of mixed responsibilities.
// Break this into parts!
//

var editor = new Editor("#ruleeditor-ace");
var errorsWhileFilling = [];

$(function() {
  var noticesVisible = false;

  I18n.loadPages(["help", "about", "notices"]);
  ChromeBootstrap.init();

  editor.on("change", function() {
    // reset notices once the user starts typing again
    if(noticesVisible) {
      $("#ruleeditor .notice").hide();
      noticesVisible = false;
    }
  });

  // A function to display a nice message in the rule editor
  var infoMsg = function(msg) {
    var fadeAfterMSec = 1000;
    var $menuInfo = $(".editor .menu .info");
    $menuInfo.html(msg).css({"opacity": "1"});
    setTimeout(function() {
      $menuInfo.animate({"opacity": 0}, 1000, function() {
        $(this).html("");
      });
    }, fadeAfterMSec);
  };

  // Fill with data from storage
  RuleStorage.loadRules().then(function (ruleString) {
    editor.setValue(ruleString, -1);
  });

  // Append text to the end of the rule definitions
  var appendRule = function(prettyRule, responseCallback) {
    // Use
    Rules.load().then(function(rulesFunction) {
      var lines = [];
      if(rulesFunction.length > 0) {
        lines.push(",");
      }
      lines = lines.concat(prettyRule.split("\n"));
      editor.document().insertLines(editor.document().getLength() - 1, lines);
      // Prettify code a little
      editor.session().setValue(Rules.format(editor.session().getValue()));
      editor.scrollToRow(editor.document().getLength());
      responseCallback();
      infoMsg("Rule added on line " + (editor.document().getLength() - 1));
    });
  };

  // Check for freshly extracted rules and show UI
  RuleStorage.loadRules(Utils.keys.extractedRule).then(function (extractedRule) {
    // There are extracted rules
    if (typeof extractedRule !== "undefined") {
      var $notice = $("#ruleeditor .notice.extracted-present");
      $notice.show();
      $("#ruleeditor button.append-extracted").removeAttr("disabled");
      $("#ruleeditor .cmd-append-extracted, #ruleeditor .append-extracted").on("click", function () {
        Utils.log("[options.js] Appending extracted rules to the end of the definition");
        appendRule(extractedRule, function() {
          $("#ruleeditor button.append-extracted").prop("disabled","disabled");
          $notice.hide();
          RuleStorage.deleteRules(Utils.keys.extractedRule);
        });
      });
    }
  });

  // Save the rules
  var saveRules = function() {
    var errors = Rules.syntaxCheck(editor);
    if(errors.length > 0) {
      errors.forEach(function (errorClass) {
        $("#ruleeditor .notice." + errorClass).show();
      });
      infoMsg("Rules invalid, not saved");
      noticesVisible = true;
    }

    if(editor.cleanUp() && !noticesVisible) {
      $("#ruleeditor .notice").hide();
      RuleStorage.saveRules(editor.getValue()).then(function () {
        infoMsg("Rules saved");
      });
    }
  };

  var loadRules = function() {
    RuleStorage.loadRules().then(function (ruleJson) {
      editor.setValue(ruleJson, -1);
      infoMsg("Rules loaded from disc");
    });
  };

  // Button handling for "save" and "load"
  $(".editor .menu").on("click", "button.save", function () {
    saveRules();
  }).on("click", "button.reload", function () {
    loadRules();
  }).on("click", "button.format", function () {
    editor.format(Rules);
    infoMsg("Rules formatted but not saved");
  });

  // Try to fix the erronous structure of the rules
  $(document).on("click", "a.cmd-fix-var-needed", function() {
    editor.fixRules();
  });

  // Listener for messages
  chrome.runtime.onMessage.addListener(function (message) {
    if(message.action === "showFillErrors") {
      errorsWhileFilling = message.errors;
      //TODO continue here
      // create editor annotations
      // make notice visible with errors
    }
  });
});

