const myVersion = "0.4.1", myProductName = "opmlValidator"; 

var opmlValidatorData = {
	strings: {
		congratulations: "Congratulations! Your OPML file validates.",
		validatedImage: "<img src=\"http://images.scripting.com/archiveScriptingCom/2005/10/31/valid3.gif\" width=\"114\" height=\"20\" border=\"0\" alt=\"OPML checked by validator.opml.org.\">",
		notValidXml: "The text in the file is not valid XML. You can use an <a href=\"http://www.google.com/search?q=xml+validator\" target=\"blank\">XML validator</a> first to find and fix the problems, then try again with the OPML Validator.",
		mustHaveOpml: "The top level-element in an OPML document must be named opml.",
		opmlVersionMustBe: "The \"version\" attribute for the opml element must be 1.0, 1.1 or 2.0.",
		mustHaveHead: "The <opml> element must have a <head> sub-element.",
		mustHaveBody: "The <opml> element must have a <body> sub-element.",
		outlineOnlyInBody: "<outline> elements should only appear inside the <body> element.",
		mustBeEncoded: "The following characters must be encoded: &, <.",
		outlineMustHaveText: "An <outline> element must have a \"text\" attribute.",
		outlineUnknownAttribute: "An <outline> element should only have known attributes. Unknown: ",
		rssNodeMustHaveXmlUrl: "An <outline> element whose type is \"rss\" must have an \"xmlUrl\" attribute.",
		rssVersionWrong: "An <outline> element whose type is \"rss\" may have a version attribute, whose value must be RSS, RSS1, RSS2, or scriptingNews.",
		linkNodeMustHaveUrl: "An <outline> element whose type is \"link\" must have an \"url\" attribute.",
		includeNodeMustHaveUrl: "An <outline> element whose type is \"include\" must have a \"url\" attribute.",
		unknownOutlineType: "The type attribute on an <outline> element should be a known type."
		},
	legalAttributes: {
		common: ["text", "type", "created", "isComment", "isBreakpoint", "category"],
		include: ["url"],
		link: ["url"],
		rss: ["xmlUrl", "description", "htmlUrl", "language", "title", "version"]
		}
	}
var appPrefs = {
	lastOpmlUrl: undefined
	}

function savePrefs () {
	localStorage.savedPrefs = jsonStringify (appPrefs);
	}
function expandTopLevel (theOutline) {
	if (theOutline.subs !== undefined) {
		for (var i = 0; i < theOutline.subs.length; i++) {
			theOutline.subs [i].collapse = false;
			}
		}
	}
function collapseEverything (theOutline, belowLevel) {
	function doCollapse (theOutline, level) {
		if (theOutline.subs !== undefined) {
			theOutline.collapse = level > belowLevel;
			for (var i = 0; i < theOutline.subs.length; i++) {
				doCollapse (theOutline.subs [i], level + 1);
				}
			}
		}
	doCollapse (theOutline, 0);
	}
function doValidate () {
	var urlOpml = $("#idUrlInput").val ();
	appPrefs.lastOpmlUrl = urlOpml;
	savePrefs ();
	
	var adrLastError, htmltext = "", cterrors = 0;
	function add (s) {
		htmltext += s + "\n";
		}
	function addErrorMessage (errorstring) {
		cterrors++;
		add ("<li>" + errorstring + "</li>")
		}
	function addError (adr, errorstring) {
		if (adr !== adrLastError) {
			addErrorMessage (errorstring + "<br><div class=\"divCode\">" + encodeXml (adr.outerHTML) + "</div>");
			console.log (errorstring);
			adrLastError = adr;
			}
		}
	function requiredSubelement (adrparent, namesubelement, errorstring, callback) {
		var adrsubelement;
		try {
			adrsubelement = xmlGetAddress (adrparent, namesubelement)
			}
		catch (err) {
			console.log ("requiredSubelement: err.message == " + err.message);
			addError (adrparent, errorstring);
			callback (false, adrsubelement);
			}
		if (adrsubelement.length == 0) {
			addError (adrparent, errorstring);
			callback (false);
			}
		else {
			console.log ("Passed: " + errorstring);
			callback (true, adrsubelement);
			}
		}
	function checkOutlinesOutsideBody (adropml) {
		var level = 0, ctErrors = 0;
		function visit (adrx) {
			$(adrx).children ().each (function () {
				var name = $(this).prop ("tagName");
				console.log (filledString ("\t", level) + name);
				if (name !== "body") {
					level++;
					visit (this);
					level--;
					}
				else {
					if (name === "outline") {
						addError (this, opmlValidatorData.strings.outlineOnlyInBody)
						ctErrors++;
						}
					}
				});
			}
		visit (adropml);
		if (ctErrors == 0) {
			console.log ("Passed: " + opmlValidatorData.strings.outlineOnlyInBody);
			}
		}
	function checkForUnencodedCharacters (adrstruct) {
		var level = 0, ctErrors = 0, ch;
		function visit (adrx) {
			var atts = new Object ();
			function checkString (s) {
				for (var i = 0; i < s.length; i++) {
					ch = s [i];
					switch (ch) {
						case "<":
							addError (adrx, opmlValidatorData.strings.mustBeEncoded);
							ctErrors++;
							return (false); //at most one error message per line
						case "&":
							//handle entities like " &#123;
							var entity = "&", flcomplete = false;
							for (var j = i + 1; j < s.length; j++) {
								entity += s [j];
								if (s [j] == ";") {
									flcomplete = true;
									break;
									}
								}
							if (flcomplete) {
								var flGoodEntity = false;
								switch (entity) {
									case "&amp;":
									case "&lt;":
									case "&gt;":
									case "'":
									case "&" + "quot;":
										flGoodEntity = true
									}
								if (!flGoodEntity) {
									if (beginsWith (entity, "&#")) {
										var numstring = stringDelete (entity, 1, 2);
										if (endsWith (numstring, ";")) {
											numstring = stringDelete (numstring, numstring.length, 1);
											try {
												var num = Number (numstring);
												flGoodEntity = true;
												}
											catch (err) {
												}
											}
										}
									}
								if (!flGoodEntity) {
									addError (adrx, opmlValidatorData.strings.mustBeEncoded);
									ctErrors++;
									return (false); //at most one error message per line
									}
								}
							else {
								addError (adrx, opmlValidatorData.strings.mustBeEncoded);
								ctErrors++;
								return (false); //at most one error message per line
								}
							break;
						}
					}
				}
			xmlGatherAttributes (adrx, atts);
			
			for (var x in atts) {
				checkString (atts [x]); 
				}
			
			$(adrx).children ().each (function () {
				var name = $(this).prop ("tagName");
				level++;
				visit (this);
				level--;
				});
			}
		visit (adrstruct);
		if (ctErrors == 0) {
			console.log ("Passed: " + opmlValidatorData.strings.mustBeEncoded);
			}
		}
	function validateOutline (adroutline) {
		var level = 0, ctErrors = 0;
		function nameNotInArray (name, array) {
			if (array !== undefined) {
				for (var i = 0; i < array.length; i++) {
					if (array [i] == name) {
						return (false); //it's in the array
						}
					}
				}
			return (true); //it's not in the array
			}
		function visit (adrx) {
			$(adrx).children ().each (function () {
				var tagname = $(this).prop ("tagName");
				if (tagname == "outline") {
					var atts = new Object ();
					xmlGatherAttributes (this, atts);
					if (atts.text === undefined) {
						addError (this, opmlValidatorData.strings.outlineMustHaveText)
						}
					else {
						console.log (filledString ("\t", level) + atts.text);
						}
					
					var type = atts.type;
					if (type !== undefined) {
						switch (type) {
							case "rss":
								if (atts.xmlUrl === undefined) {
									addError (this, opmlValidatorData.strings.rssNodeMustHaveXmlUrl)
									}
								if (atts.version !== undefined) { //4/13/23 by DW
									if ((atts.version != "RSS1") && (atts.version != "RSS2") && (atts.version != "RSS") && (atts.version != "scriptingNews")) {
										addError (this, opmlValidatorData.strings.rssVersionWrong);
										}
									}
								break;
							case "link":
								if (atts.url === undefined) {
									addError (this, opmlValidatorData.strings.linkNodeMustHaveUrl)
									}
								break;
							case "include":
								if (atts.url === undefined) {
									addError (this, opmlValidatorData.strings.includeNodeMustHaveUrl)
									}
								break;
							default: 
								addError (this, opmlValidatorData.strings.unknownOutlineType);
								break;
							}
						}
					for (var attname in atts) {
						if (nameNotInArray (attname, opmlValidatorData.legalAttributes.common) && nameNotInArray (attname, opmlValidatorData.legalAttributes [type])) {
							addError (this, opmlValidatorData.strings.outlineUnknownAttribute + attname);
							return (false);
							}
						}
					}
				level++;
				visit (this);
				level--;
				});
			}
		visit (adroutline);
		}
	function getValidatedImage () {
		var s = opmlValidatorData.strings.validatedImage;
		s = "<span class=\"spValidatedImage\"><a href=\"" + urlOpml + "\">" + s + "</span>";
		return (s);
		}
	
	readHttpFileThruProxy (urlOpml, undefined, function (opmltext) {
		var xstruct;
		try {
			xstruct = $($.parseXML (opmltext));
			}
		catch (err) {
			$("#idValidationMessage").html ("<p>" + opmlValidatorData.strings.notValidXml + "</p>");
			return;
			}
		
		requiredSubelement (xstruct, "opml", opmlValidatorData.strings.mustHaveOpml, function (flGood, adropml) {
			if (flGood) {
				var version=  xmlGetAttribute (adropml, "version");
				console.log ("doValidate: version == " + version);
				
				var flGoodVersion = (version === "1.0") || (version === "1.1") || (version === "2.0");
				if (!flGoodVersion) {
					addError (adropml, opmlValidatorData.strings.opmlVersionMustBe);
					}
				
				requiredSubelement (adropml, "head", opmlValidatorData.strings.mustHaveHead, function (flGood, adrhead) {
					requiredSubelement (adropml, "body", opmlValidatorData.strings.mustHaveBody, function (flGood, adrbody) {
						checkOutlinesOutsideBody (adropml);
						checkForUnencodedCharacters (adropml);
						validateOutline (adrbody);
						
						if (cterrors == 0) {
							htmltext = opmlValidatorData.strings.congratulations + getValidatedImage ();
							}
						else {
							htmltext = "<ul>" + htmltext + "</ul>";
							}
						$("#idValidationMessage").html (htmltext);
						});
					});
				}
			});
		
		});
	}
function everySecond () {
	}
function startup () {
	console.log ("startup");
	if (localStorage.savedPrefs !== undefined) {
		appPrefs = JSON.parse (localStorage.savedPrefs);
		$("#idUrlInput").val (appPrefs.lastOpmlUrl);
		}
	self.setInterval (everySecond, 1000); 
	}
