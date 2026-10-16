Hier is een heldere beschrijving van wat hier gebouwd is, in pseudo-code / componentstructuur.
KDB Control Panel└── topLevelContainer    ├── contentContainer    │   ├── headerContainer    │   │   ├── titleText: "Dashboard-Steuerung"    │   │   ├── settingsToggleIcon    │   │   └── infoIcon / manualLink    │   │    │   ├── settingsOuterContainer    │   │   └── settingsContainer    │   │       ├── expandableSection: "Dashboard"    │   │       │   └── dashboardSettingsContainer    │   │       │       ├── input: Breite    │   │       │       ├── input: Höhe    │   │       │       ├── colorInputWithDropdown: Hintergrundfarbe    │   │       │       └── toggleGroup: Buttons verstecken    │   │       │           ├── toggleSwitch: Settings-Buttons verstecken    │   │       │           └── toggleSwitch: SU-Buttons verstecken    │   │       │    │   │       ├── expandableSection: "Diagramme"    │   │       │   └── graphSettingsContainer    │   │       │       ├── input: Breite    │   │       │       ├── input: Höhe    │   │       │       └── colorInputWithDropdown: Hintergrundfarbe    │   │       │    │   │       ├── expandableSection: "Kommentare"    │   │       │   └── commentSettingsContainer    │   │       │       ├── input: Breite    │   │       │       ├── input: Höhe    │   │       │       └── colorInputWithDropdown: Hintergrundfarbe    │   │       │    │   │       └── expandableSection: "Steuerungspanel"    │   │           └── controlPanelSettingsContainer    │   │               ├── colorInputWithDropdown: Hintergrundfarbe    │   │               ├── colorInputWithDropdown: Button-Farbe    │   │               └── colorInputWithDropdown: Aktionsbutton-Farbe    │   │    │   ├── saveLoadContainer    │   │   └── currently empty    │   │    │   ├── mainTogglesContainer    │   │   ├── expandableSection: "Kennzahlen"    │   │   └── expandableSection: "Toolbox"    │   │    │   └── mainTogglesBlockOuterContainer    │       ├── kennzahlenContainer    │       │   └── currently empty    │       │    │       └── toolboxContainer    │           ├── expandableSection: "Kommentar"    │           │   └── commentsToolboxContainer    │           │       └── draggableBlueActionButton: "Kommentar"    │           │    │           ├── expandableSection: "Tab"    │           │   └── tabsToolboxContainer    │           │       ├── blueActionButton: "Tab hinzufügen"    │           │       └── tabEditArea    │           │           └── form for rename/delete/duplicate/move options    │           │    │           └── expandableSection: "Kopfzeile/Fußzeile"    │               └── headerFooterToolboxContainer    │                   ├── toggleSwitch: Kopfzeile anzeigen    │                   ├── toggleSwitch: Fußzeile anzeigen    │                   ├── toggleSwitch: Untertitel anzeigen    │                   └── radioButtonGroup: Kopfzeilentext ändern    │                       ├── radio: header title edit    │                       └── radio: subtitle edit    │    └── arrowContainer        └── arrowIcon            ├── open state: arrow points left            └── collapsed state: arrow points right
Hoofdstructuur
De hele control UI bestaat uit één buitenste container:
#kdb-control_top-level_container
Deze container heeft conceptueel twee children:
topLevelContainer├── contentContainer└── collapseArrowBar
De rechter child is de smalle verticale inklap-/uitklapbalk. Deze loopt visueel over de volledige hoogte van het control panel. In deze bar staat een pijl. De richting van de pijl wisselt afhankelijk van de state:
if controlPanel.isOpen:    show arrow "◀"else:    show arrow "▶"
De linker child is de eigenlijke inhoud van het control panel:
#kdb-control_content_container
Daarin zitten alle header-, settings-, toolbox- en button-secties.
Header
Bovenaan staat een header-container:
headerContainer├── titleText├── settingsIcon└── infoIcon
In pseudo-code:
createHeader()    addTitle("Dashboard-Steuerung")    addSettingsToggleIcon()    addInfoLinkIcon()
De titel staat links/centraal in het headerblok. Rechts staan twee iconen:
settingsIcon    toggles settingsOuterContainerinfoIcon    opens user manual link in new tab
De settings-knop is zelf ook een toggle button. Hij opent of sluit de volledige settings-sectie.
Reusable expand/collapse pattern
Bijna alle grijze knoppen werken volgens hetzelfde patroon.
Ze zijn allemaal varianten van:
ToggleButton├── visible button├── data-target = id of controlled container└── controlled container
Algemeen patroon:
createExpandableSection(label, targetContainerId, groupClass)    createButton(label)        class: kdb-control_toggle_button        data-target: targetContainerId    createContainer(targetContainerId)        hidden or visible depending on toggle state
Voorbeelden:
button "Dashboard"    data-target="kdb-control_settings-dashboard_container"button "Diagramme"    data-target="kdb-control_settings-graphs_container"button "Kommentare"    data-target="kdb-control_settings-comments_container"button "Steuerungspanel"    data-target="kdb-control_settings-control-el_container"button "Kennzahlen"    data-target="kdb-control_kennzahlen_container"button "Toolbox"    data-target="kdb-control_toolbox_container"button "Kommentar"    data-target="kdb-control_toolbox-comments_container"button "Tab"    data-target="kdb-control_toolbox-tabs_container"button "Kopfzeile/Fußzeile"    data-target="kdb-control_toolbox-header_container"
Dus: de grijze expand/collapse buttons zijn functioneel hetzelfde componenttype. Alleen hun label, target-container en toggle-group verschillen.
Toggle-groepen
Er zijn meerdere toggle-groepen:
topToggleGroup├── Kennzahlen└── ToolboxsettingsToggleGroup├── Dashboard├── Diagramme├── Kommentare└── SteuerungspaneltoolboxToggleGroup├── Kommentar├── Tab└── Kopfzeile/Fußzeile
Pseudo-code:
toggleButton.onClick()    target = document.getElementById(button.dataset.target)    if target is visible:        hide target        remove selected class from button    else:        show target        add selected class to button    optionally close sibling containers in the same toggle group
De screenshots tonen dat de geselecteerde knop een onderstreping krijgt. Dat is waarschijnlijk gekoppeld aan een selected-class, bijvoorbeeld:
kdb-control_selected
Settings-panel
Het settings-panel wordt via het tandwiel geopend. Binnen het settings-panel staan vier grijze section toggles:
Settings├── Dashboard├── Diagramme├── Kommentare└── Steuerungspanel
Dashboard settings
DashboardSettings├── row│   ├── textInput: Breite│   └── textInput: Höhe├── row│   ├── colorInputWithDropdown: Hintergrundfarbe│   └── toggleStack: Buttons verstecken│       ├── toggleSwitch for settings buttons│       └── toggleSwitch for SU buttons
Pseudo-code:
createDashboardSettings()    addTextInput("Breite", placeholder="Min. 1800px/48cm")    addTextInput("Höhe", placeholder="Min. 780px/21cm")    addColorInput("Hintergrundfarbe")    addToggleSwitch("Buttons verstecken", action="dashboard.settingsButtons.toggle")    addToggleSwitch("SU", action="dashboard.suButtons.toggle")
Diagramme settings
GraphSettings├── textInput: Breite├── textInput: Höhe└── colorInputWithDropdown: Hintergrundfarbe
Pseudo-code:
createGraphSettings()    addTextInput("Breite", placeholder="Min. 300px/8cm")    addTextInput("Höhe", placeholder="Min. 300px/8cm")    addColorInput("Hintergrundfarbe")
Kommentare settings
CommentSettings├── textInput: Breite├── textInput: Höhe└── colorInputWithDropdown: Hintergrundfarbe
Pseudo-code:
createCommentSettings()    addTextInput("Breite", placeholder="Min. 300px/8cm")    addTextInput("Höhe", placeholder="Min. 75px/2cm")    addColorInput("Hintergrundfarbe")
Steuerungspanel settings
ControlPanelSettings├── colorInputWithDropdown: Hintergrundfarbe├── colorInputWithDropdown: Button-Farbe└── colorInputWithDropdown: Aktionsbutton-Farbe
Pseudo-code:
createControlPanelSettings()    addColorInput("Hintergrundfarbe")    addColorInput("Button-Farbe")    addColorInput("Aktionsbutton-Farbe")
Main area: Kennzahlen en Toolbox
Onder de settings-zone staan twee hoofdknoppen:
mainToggles├── Kennzahlen└── Toolbox
Deze werken opnieuw als dezelfde reusable expand/collapse buttons:
createMainToggle("Kennzahlen", "kdb-control_kennzahlen_container")createMainToggle("Toolbox", "kdb-control_toolbox_container")
De Kennzahlen container bestaat al, maar is in de huidige HTML leeg:
kennzahlenContainer└── empty
De Toolbox container heeft drie subsecties:
Toolbox├── Kommentar├── Tab└── Kopfzeile/Fußzeile
Toolbox: Kommentar
KommentarToolbox└── draggableButtonContainer    ├── label: "neues Kommentar hinzufügen"    └── draggable blue button: "Kommentar"
Pseudo-code:
createCommentToolbox()    addLabel("neues Kommentar hinzufügen")    addDraggableActionButton("Kommentar")        draggable = true        drag-type = "text"
Deze knop is een actieknop én draggable element. Hij wordt waarschijnlijk naar het dashboard gesleept om een nieuw commentaar/text-widget te maken.
Toolbox: Tab
TabToolbox├── actionButtonContainer│   ├── label: "Neuen Tab hinzufügen"│   └── blueActionButton: "Tab hinzufügen"└── editTabContainer    ├── label: "Tabs umbenennen/löschen/duplizieren/verschieben"    └── form placeholder
Pseudo-code:
createTabToolbox()    addActionButton("Tab hinzufügen", action="tabs.add")    addTabEditForm()        supports rename/delete/duplicate/move
De blauwe knop is een echte action button:
button    class: kdb-control_action-button    data-kdb-action: tabs.add
Toolbox: Kopfzeile/Fußzeile
HeaderFooterToolbox├── sectionLabel: "Anzeigen:"├── row│   ├── toggleSwitch: Kopfzeile│   └── toggleSwitch: Fußzeile├── row│   ├── toggleSwitch: Untertitel anzeigen│   └── radioButtonGroup: Kopfzeilentext ändern
Pseudo-code:
createHeaderFooterToolbox()    addSectionLabel("Anzeigen:")    addToggleSwitch("Kopfzeile", action="header.toggle")    addToggleSwitch("Fußzeile", action="footer.toggle")    addToggleSwitch("Untertitel anzeigen", action="header.subtitle.toggle")    addRadioGroup("Kopfzeilentext ändern")        addRadio("renameHeader", action="header.edit")        addRadio("renameHeaderSubtitle", action="header.subtitle.edit")
Inputvelden
De gewone tekst-inputs worden gebruikt voor afmetingen en kleurwaarden.
Algemeen inputpatroon:
InputRow├── label└── input[type="text"]
Voorbeeld:
<div class="kdb-control_input-row">    <div class="kdb-control_input-label">Breite</div>    <input type="text" class="kdb-control_text-input"></div>
Pseudo-code:
createTextInput(label, placeholder, maxLength)    createContainer(class="kdb-control_input-row")    addLabel(label)    addInput(type="text", maxLength=maxLength, placeholder=placeholder)
Gebruikte tekst-inputtypes:
dimensionInput├── Breite└── HöhecolorInput├── Hintergrundfarbe├── Button-Farbe└── Aktionsbutton-Farbe
Color dropdown inputs
Kleurvelden zijn gewone tekst-inputs met daaronder een verborgen dropdown:
ColorInputWithDropdown├── label├── textInput└── hiddenDropdown    ├── colorOption: default #ffffff    ├── colorOption: transparent #00000000    ├── colorOption: abendstimmung #49274b    ├── colorOption: frischgruen #82d282    ├── colorOption: goldgelb #e6c828    ├── colorOption: wienrot #ff0000    └── etc.
Pseudo-code:
createColorInput(label)    createTextInput(label, placeholder="#Farbcode (zB. #FFA500)")    createDropdown(hidden=true)        for each color in colorPalette:            addColorOption(color.key, color.value)
Elk dropdown item bevat:
colorOption├── data-color-key├── data-color-value├── title├── background-color style└── visible text: "<key> <hex>"
Toggle switches
De schuifknoppen zijn checkbox-gebaseerde toggle buttons.
Algemeen patroon:
ToggleSwitch└── container    └── label.switch        ├── input[type="checkbox"]        └── span.slider
Pseudo-code:
createToggleSwitch(label, action, checked=false)    addLabel(label)    createCheckbox()        type = "checkbox"        data-kdb-action = action        checked = checked    addSliderVisual()
Voorbeelden:
header.togglefooter.toggleheader.subtitle.toggledashboard.settingsButtons.toggledashboard.suButtons.toggle
De visuele slider is niet de input zelf, maar de span ernaast:
<span class="KDB_ToggleButton_slider KDB_ToggleButton_round"></span>
De echte state zit in:
<input type="checkbox">
Blauwe action buttons
De blauwe knoppen zijn geen expand/collapse buttons. Ze voeren direct een actie uit.
Voorbeelden:
KommentarTab hinzufügen
Pseudo-code:
createActionButton(label, action)    button.label = label    button.class = "kdb-control_action-button"    button.data-kdb-action = action
Bij Kommentar is de actieknop ook draggable:
createDraggableActionButton("Kommentar")    draggable = true    drag-type = "text"
Bij Tab hinzufügen is het een directe klikactie:
createActionButton("Tab hinzufügen", action="tabs.add")
Radio buttons
Radio buttons worden gebruikt voor edit-modi, bijvoorbeeld bij het wijzigen van headertekst.
Structuur:
RadioButtonGroup└── form    ├── label    │   └── input[type="radio"]    └── label        └── input[type="radio"]
Pseudo-code:
createRadioGroup(name="option")    addRadioButton(        id="KDB_renameHeader",        value="renameHeader",        action="header.edit"    )    addRadioButton(        id="KDB_renameHeaderSubtitle",        value="renameHeaderSubtitle",        action="header.subtitle.edit",        disabled=true    )
Belangrijk verschil:
toggle switch    = aan/uit stateradio button    = keuze binnen een groep / edit modeaction button    = directe actie uitvoerenexpand/collapse button    = container zichtbaar/onzichtbaar maken
Functionele samenvatting
buildKdbControl()    createTopLevelContainer()    createContentContainer()        createHeader()            addTitle()            addSettingsToggle()            addInfoLink()        createSettingsPanel()            addExpandableSection("Dashboard")                addDashboardSizeInputs()                addDashboardColorInput()                addHideButtonsToggles()            addExpandableSection("Diagramme")                addVisualizationSizeInputs()                addVisualizationColorInput()            addExpandableSection("Kommentare")                addCommentSizeInputs()                addCommentColorInput()            addExpandableSection("Steuerungspanel")                addControlPanelColorInputs()        createSaveLoadContainer()            // currently empty        createMainToggleButtons()            addExpandableSection("Kennzahlen")                // currently empty            addExpandableSection("Toolbox")                addExpandableSection("Kommentar")                    addDraggableCommentButton()                addExpandableSection("Tab")                    addAddTabButton()                    addTabEditFormPlaceholder()                addExpandableSection("Kopfzeile/Fußzeile")                    addHeaderToggle()                    addFooterToggle()                    addSubtitleToggle()                    addHeaderEditRadioGroup()    createCollapseArrowBar()        addArrowIcon()        bindOpenCloseBehavior()
Kernconcept
De UI is opgebouwd uit een klein aantal herbruikbare primitives:
1. panel container2. header container3. expand/collapse button + target container4. text input row5. color input with dropdown6. checkbox toggle switch7. blue action button8. draggable action button9. radio button group10. right-side collapse rail
Het belangrijkste structurele patroon is:
button[data-target] controls container[id]
Dus de meeste grijze knoppen zijn niet aparte componenttypes, maar instanties van hetzelfde expand/collapse-mechanisme. Alleen de inhoud van hun target-container verschilt.