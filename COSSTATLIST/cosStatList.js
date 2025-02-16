"use strict";
var creatureList = [];
var nameStat;
var statList = [];
var selectedStats = [];
var activeFilters = [];
var currentSortingStat;
var sortAscending = false;
var sortDirty = false;
var LOADING_GRAY = document.getElementById('loadingGray');
var STAT_LIST_TABLE = document.getElementById("statList");
var CONFIGURE_STAT_TYPES_BUTTON = document.getElementById("addStatTypesButton");
var FILTER_CONTAINING_DIV = document.getElementById("filterConfigurations");
var FLOATING_WINDOW = document.getElementById("floatingWindow");
var FLOATING_WINDOW_TABLE = document.getElementById("floatingWindowTable");
var FLOATING_WINDOW_SEARCH_BAR = document.getElementById("floatingWindowSearchBar");
var FilterType;
(function (FilterType) {
    FilterType[FilterType["EQUALS"] = 0] = "EQUALS";
    FilterType[FilterType["CONTAINS"] = 1] = "CONTAINS";
    FilterType[FilterType["LESS_THAN"] = 2] = "LESS_THAN";
    FilterType[FilterType["LESS_THAN_EQUALS"] = 3] = "LESS_THAN_EQUALS";
    FilterType[FilterType["GREATER_THAN"] = 4] = "GREATER_THAN";
    FilterType[FilterType["GREATER_THAN_EQUALS"] = 5] = "GREATER_THAN_EQUALS";
})(FilterType || (FilterType = {}));
class Filter {
    constructor(statType, filterType, inputtedText, reverseFilter) {
        this.statType = statType;
        this.filterType = filterType;
        this.inputtedText = inputtedText;
        this.reverseFilter = reverseFilter;
    }
    test(creature) {
        const filterResult = this.statType.filter(creature, this.filterType, this.inputtedText);
        return (this.reverseFilter) ? !filterResult : filterResult;
    }
}
class StatValue {
    setDisplayName(displayName) {
        this.displayName = displayName;
    }
    setCanBeDisabled(canBeDisabled) {
        this.canBeDisabled = canBeDisabled;
    }
    getDisplayValue(creature) {
        return String(this.getValue(creature));
    }
    constructor(keyName) {
        this.canBeDisabled = true;
        this.keyName = this.displayName = keyName;
    }
}
class AbilityBooleanValue extends StatValue {
    constructor(keyName) {
        super(keyName.toLowerCase());
    }
    getDisplayValue(creature) {
        return this.getValue(creature) ? "Yes" : "No";
    }
    getValue(creature) {
        let indexOf = creature.passive.indexOf(this.keyName);
        if (indexOf == -1) {
            indexOf = creature.activated.indexOf(this.keyName);
            return indexOf != -1;
        }
        else {
            return true;
        }
    }
    sort(creature1, _) {
        return (this.getValue(creature1) ? -1 : 1) * (sortAscending ? -1 : 1);
    }
    filter(creature, filterType, testVal) {
        switch (filterType) {
            case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
            default: return false;
        }
    }
}
class NumberStatValue extends StatValue {
    constructor(keyName) {
        super(keyName);
    }
    getDisplayValue(creature) {
        const value = this.getValue(creature);
        if (isNaN(value))
            return "N/A";
        else
            return String(value);
    }
    sort(creature1, creature2) {
        let creature1Value = this.getValue(creature1);
        let creature2Value = this.getValue(creature2);
        if (isNaN(creature1Value))
            return Number.MAX_SAFE_INTEGER;
        if (isNaN(creature2Value))
            return Number.MIN_SAFE_INTEGER;
        return (sortAscending) ? creature1Value - creature2Value : creature2Value - creature1Value;
    }
    // override sort = ((creature1: Creature, creature2: Creature): number => {
    //     let creature1Value = this.getValue(creature1);
    //     let creature2Value = this.getValue(creature2);
    //     if (isNaN(creature1Value)) return Number.MAX_SAFE_INTEGER;
    //     if (isNaN(creature2Value)) return Number.MIN_SAFE_INTEGER;
    //     return (sortAscending) ? creature1Value - creature2Value : creature2Value - creature1Value;
    // }).bind(this);
    filter(creature, filterType, testVal) {
        switch (filterType) {
            case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
            case FilterType.LESS_THAN: return this.getValue(creature) < parseFloat(testVal);
            case FilterType.LESS_THAN_EQUALS: return this.getValue(creature) <= parseFloat(testVal);
            case FilterType.GREATER_THAN: return this.getValue(creature) > parseFloat(testVal);
            case FilterType.GREATER_THAN_EQUALS: return this.getValue(creature) >= parseFloat(testVal);
            default: return false;
        }
    }
}
class KeyedNumberStatValue extends NumberStatValue {
    constructor(keyName) {
        super(keyName);
    }
    getValue(creature) {
        return parseFloat(creature[this.keyName]);
    }
}
class AbilityNumberStatValue extends NumberStatValue {
    constructor(keyName) {
        super(keyName.toLowerCase());
    }
    getValue(creature) {
        let searchString = creature.passive;
        let indexOf = searchString.indexOf(this.keyName);
        if (indexOf == -1) {
            searchString = creature.activated;
            indexOf = searchString.indexOf(this.keyName);
        }
        if (indexOf == -1)
            return NaN;
        let abilityNameEndIndex = indexOf + this.keyName.length;
        let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex) + 1, searchString.indexOf(")", abilityNameEndIndex));
        return parseFloat(abilityValue);
    }
}
class StringStatValue extends StatValue {
    constructor(keyName) {
        super(keyName);
    }
    sort(creature1, creature2) {
        const creature1Val = this.getValue(creature1);
        const creature2Val = this.getValue(creature2);
        if (creature1Val == "N/A")
            return Number.MAX_SAFE_INTEGER;
        if (creature2Val == "N/A")
            return Number.MIN_SAFE_INTEGER;
        return creature1Val.localeCompare(creature2Val) * ((sortAscending) ? -1 : 1);
    }
    filter(creature, filterType, testVal) {
        switch (filterType) {
            case FilterType.EQUALS: return this.getValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getValue(creature).toLowerCase().includes(testVal.toLowerCase());
            default: return false;
        }
    }
}
class KeyedStringStatValue extends StringStatValue {
    constructor(keyName) {
        super(keyName);
    }
    getValue(creature) {
        return creature[this.keyName];
    }
}
class AbilityStringStatValue extends StringStatValue {
    constructor(keyName) {
        super(keyName.toLowerCase());
    }
    getValue(creature) {
        let searchString = creature.passive;
        let indexOf = searchString.indexOf(this.keyName);
        if (indexOf == -1) {
            searchString = creature.activated;
            indexOf = searchString.indexOf(this.keyName);
        }
        if (indexOf == -1)
            return "N/A";
        let abilityNameEndIndex = indexOf + this.keyName.length;
        // noinspection UnnecessaryLocalVariableJS
        let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex) + 1, searchString.indexOf(")", abilityNameEndIndex));
        return abilityValue;
    }
}
function initializeStatList() {
    return new Promise((resolve) => {
        function onError(reason) {
            setTimeout(tryLoad, 5000);
            console.error(reason);
            console.log("statList.json failed to download. Retrying in 5000ms");
        }
        function tryLoad() {
            fetch("statList.json").then(response => {
                if (!response.ok)
                    throw new Error("Response is not ok");
                response.json().then((jsonStatList) => {
                    for (const jsonStat of jsonStatList) {
                        statList.push(createStatValue(jsonStat));
                    }
                    resolve();
                }).catch(onError);
            }).catch(onError);
        }
        function createStatValue(jsonStat) {
            let statValue;
            if (jsonStat.keyed) {
                switch (jsonStat.type) {
                    case "number":
                        statValue = new KeyedNumberStatValue(jsonStat.keyName);
                        break;
                    case "string":
                    case "date": //date is unimplemented so it is treated like a string
                        statValue = new KeyedStringStatValue(jsonStat.keyName);
                        break;
                    case "boolean":
                        throw TypeError("There is no class type for a keyed boolean StatValue");
                }
            }
            else {
                switch (jsonStat.type) {
                    case "boolean":
                        statValue = new AbilityBooleanValue(jsonStat.keyName);
                        break;
                    case "number":
                        statValue = new AbilityNumberStatValue(jsonStat.keyName);
                        break;
                    case "string":
                    case "date": //date is unimplemented so it is treated like a string
                        statValue = new AbilityStringStatValue(jsonStat.keyName);
                }
            }
            statValue.setDisplayName(jsonStat.displayName ?? jsonStat.keyName);
            if (jsonStat.canBeDisabled !== undefined)
                statValue.setCanBeDisabled(jsonStat.canBeDisabled);
            return statValue;
        }
        tryLoad();
    });
    // for(const creature of creatureList){
    //     for(let abilityString of creature.passive.split(',')){
    //         abilityString = abilityString.trim();
    //
    //         const valueBegin = abilityString.indexOf('(');
    //         if(valueBegin == -1){
    //             const abilityKeyName = abilityString.toLowerCase();
    //             if(!getStatValueWithKeyName(abilityKeyName)) {
    //                 statList.push(new ValuelessAbilityStat(abilityString, abilityKeyName));
    //             }
    //         } else {
    //             const abilityName = abilityString.substring(0, valueBegin).trim();
    //             const abilityKeyName = abilityName.toLowerCase();
    //             if(getStatValueWithKeyName(abilityKeyName)) continue;
    //
    //             const valueEnd = abilityString.indexOf(')');
    //             const abilityValue = abilityString.substring(valueBegin+1, valueEnd);
    //             const numericAbilityValue = Number(abilityValue);
    //
    //             if(!Number.isNaN(numericAbilityValue)){
    //                 statList.push(new AbilityNumberStatValue(abilityName, abilityName.toLowerCase()))
    //             } else {
    //                 statList.push(new AbilityStringStatValue(abilityName, abilityName.toLowerCase()))
    //             }
    //         }
    //     }
    // }
}
function initializeCreatureList() {
    return new Promise((resolve) => {
        function onError(reason) {
            setTimeout(tryLoad, 5000);
            console.error(reason);
            console.log("creatureStats.json failed to download. Retrying in 5000ms");
        }
        function tryLoad() {
            fetch("creatureStats.json").then(response => {
                if (!response.ok)
                    throw new Error("Response is not ok");
                response.json().then((uninitializedCreatureStats) => {
                    const creatureStats = [];
                    for (const [_, value] of Object.entries(uninitializedCreatureStats)) {
                        initializeCreatureObject(value);
                        creatureStats.push(value);
                    }
                    creatureList = creatureStats;
                    resolve();
                }).catch(onError);
            }).catch(onError);
        }
        tryLoad();
    });
}
function initializeCreatureObject(creature) {
    creature.passive = creature.passive.toLowerCase();
    creature.activated = creature.activated.toLowerCase();
    creature.tableRow = document.createElement("tr");
    creature.tableRow.setAttribute("class", "creatureTableRow");
    creature.tableRow.title = creature.common;
}
function addStatValueToCreatureRows(statValue) {
    for (let i = 0; i < creatureList.length; i++) {
        const creature = creatureList[i];
        const newCell = document.createElement("td");
        newCell.setAttribute("tabindex", "-1");
        newCell.setAttribute("class", "creatureStatCell focusable");
        newCell.title = `${creature.common} - ${statValue.displayName}`;
        newCell.textContent = statValue.getDisplayValue(creature);
        creature.tableRow.appendChild(newCell);
    }
}
// function removeStatValueFromCreatureRows(keyName: string){
//     for(let i = 0; i < COSStatList.length; i++){
//         const childCells = COSStatList[i].tableRow.children;
//         for(let i = 0; i < childCells.length; i++){
//             if(childCells[i].getAttribute("data-keyname") == keyName){
//                 childCells[i].remove();
//                 break;
//             }
//         }
//     }
// }
function removeStatValueFromCreatureRows(index) {
    for (let i = 0; i < creatureList.length; i++) {
        creatureList[i].tableRow.children[index].remove();
    }
}
function getSelectedStatValueWithKeyName(keyName) {
    for (let i = 0; i < selectedStats.length; i++) {
        if (selectedStats[i].keyName == keyName)
            return selectedStats[i];
    }
    return null;
}
function getStatValueWithKeyName(keyName) {
    for (let i = 0; i < statList.length; i++) {
        if (statList[i].keyName == keyName)
            return statList[i];
    }
    return null;
}
function indexOfSelectedStat(selectedStat) {
    for (let i = 0; i < selectedStats.length; i++) {
        if (selectedStats[i] == selectedStat)
            return i;
    }
    return -1;
}
async function updateCreatureStatsTable() {
    if (creatureList.length == 0)
        return; //it's not initialized yet!
    console.time("updateTable");
    STAT_LIST_TABLE.toggleAttribute('disabled', true);
    LOADING_GRAY.toggleAttribute("enable", true);
    // await sleep(0);
    // await sleep(0);
    await new Promise((resolve) => {
        requestAnimationFrame(() => {
            setTimeout(requestAnimationFrame, 0, () => {
                setTimeout(requestAnimationFrame, 0, resolve);
            });
        });
    });
    let removedTableBody = false;
    const statTableBody = STAT_LIST_TABLE.querySelector("tbody");
    function ensureTableBodyRemoved() {
        if (!removedTableBody) {
            statTableBody.remove();
            removedTableBody = true;
        }
    }
    filterCreatures();
    let tableHeaderRow = STAT_LIST_TABLE.querySelector("thead").querySelector("tr");
    const headerCells = tableHeaderRow.children;
    const headerCellsKeyNames = [];
    for (let i = 0; i < headerCells.length; i++) {
        const cell = headerCells[i];
        const keyName = cell.getAttribute("data-keyname");
        if (getSelectedStatValueWithKeyName(keyName) != null) {
            headerCellsKeyNames.push(keyName);
        }
        else {
            ensureTableBodyRemoved();
            cell.remove();
            removeStatValueFromCreatureRows(i);
            --i;
        }
    }
    for (let i = 0; i < selectedStats.length; i++) {
        const statValue = selectedStats[i];
        if (!headerCellsKeyNames.includes(statValue.keyName)) {
            ensureTableBodyRemoved();
            let newCell = document.createElement("th");
            newCell.setAttribute("tabindex", "0");
            newCell.setAttribute("scope", "col");
            newCell.setAttribute("data-keyname", statValue.keyName);
            newCell.setAttribute("class", "clickableButton creatureStatHeaderCell creatureStatCell");
            newCell.textContent = statValue.displayName;
            tableHeaderRow.appendChild(newCell);
            addStatValueToCreatureRows(statValue);
        }
    }
    if (sortDirty) {
        // ensureTableBodyRemoved();  //THIS IS MORE EXPENSIVE BC ONLY DOM MODIFICATION PAST THIS POINT IS REPLACECHILDREN
        const wasAscending = sortAscending;
        sortAscending = false;
        creatureList.sort(nameStat.sort.bind(nameStat));
        sortAscending = wasAscending;
        creatureList.sort(currentSortingStat.sort.bind(currentSortingStat));
        const rowsToAppend = [];
        for (const creature of creatureList)
            rowsToAppend.push(creature.tableRow);
        statTableBody.replaceChildren(...rowsToAppend);
        // statTableBody.replaceChildren();
        // // STAT_LIST_TABLE.style.width = (selectedStats.length*25) + "ch"
        // for(let i = 0; i < rowsToAppend.length; i++){
        //     statTableBody.append(rowsToAppend[i])
        //     await sleep(25);
        // }
        sortDirty = false;
    }
    updateRowColors(statTableBody);
    if (removedTableBody)
        STAT_LIST_TABLE.appendChild(statTableBody);
    console.timeEnd("updateTable");
    LOADING_GRAY.toggleAttribute("enable", false);
}
function updateRowColors(statTableBody) {
    let brightGray = false;
    // const statTableBody = STAT_LIST_TABLE.querySelector("tbody");
    var rows = statTableBody.rows;
    for (const row of rows) {
        if (row.style.display != "none") {
            if (brightGray)
                row.style.backgroundColor = "#ffffff";
            else
                row.style.backgroundColor = "#ebebeb";
            brightGray = !brightGray;
        }
    }
}
function createFilter() {
    const div = document.createElement("div");
    const button = document.createElement("button"); //div.querySelector("button[name='statTypeSelect']")
    button.name = "statTypeSelect";
    button.value = "-1";
    button.style.width = "28ch";
    button.textContent = "SELECT STAT TYPE";
    button.title = "Select a stat to filter!";
    button.addEventListener("click", () => {
        openChooseTypeMenu(button);
    });
    const deleteFilterButton = document.createElement("button");
    deleteFilterButton.name = "deleteFilter";
    deleteFilterButton.textContent = "Delete";
    deleteFilterButton.addEventListener("click", () => {
        deleteFilterButton.closest("div").remove();
    });
    const select = document.createElement("select");
    select.name = "equalityType";
    select.title = "Choose what this stat should be!";
    select.append(createOption("equals", "EQUALS"), createOption("contains", "CONTAINS"), createOption("lessThan", "<"), createOption("lessThanEquals", "≤"), createOption("greaterThan", ">"), createOption("greaterThanEquals", "≥"));
    const textInput = document.createElement("input");
    textInput.autocomplete = "off";
    textInput.type = "text";
    textInput.name = "statFilterInput";
    textInput.style.width = "20ch";
    textInput.placeholder = "Enter text or number";
    const reverseLabel = document.createElement("label");
    reverseLabel.setAttribute("data-labelType", "reverse");
    reverseLabel.title = "Show the creatures that don't match this filter!";
    reverseLabel.style.marginRight = "5px";
    const reverseCheckbox = document.createElement("input");
    reverseCheckbox.type = "checkbox";
    reverseCheckbox.name = "reverseCheckbox";
    const activeLabel = document.createElement("label");
    activeLabel.setAttribute("data-labelType", "active");
    activeLabel.title = "Enable / Disable this filter!";
    activeLabel.style.marginRight = "5px";
    const activeCheckbox = document.createElement("input");
    activeCheckbox.type = "checkbox";
    activeCheckbox.name = "activeCheckbox";
    activeCheckbox.checked = true;
    reverseLabel.append(reverseCheckbox, "Reverse");
    activeLabel.append(activeCheckbox, "Active");
    div.append(button, select, textInput, reverseLabel, activeLabel, deleteFilterButton);
    return div;
}
function updateFilterChanges() {
    var filterContainingDivs = FILTER_CONTAINING_DIV.children;
    activeFilters = [];
    for (const div of filterContainingDivs) {
        if (!(div instanceof HTMLDivElement) || div.id == "floatingWindow")
            continue;
        if (!div.querySelector("label[data-labelType='active']").querySelector("input[type='checkbox']").checked)
            continue;
        const statTypeIndex = Number(div.querySelector("button[name='statTypeSelect']").value);
        if (Number.isNaN(statTypeIndex) || statTypeIndex == -1)
            continue;
        const filterType = getFilterTypeFromValue(div.querySelector("select").value);
        if (filterType == null)
            continue;
        const inputtedText = div.querySelector("input[type='text']").value;
        const reverseFilter = div.querySelector("label[data-labelType='reverse']").querySelector("input[type='checkbox']").checked;
        activeFilters.push(new Filter(statList[statTypeIndex], filterType, inputtedText, reverseFilter));
    }
    updateCreatureStatsTable();
}
function filterCreatures() {
    for (const creature of creatureList) {
        let matchesAllFilters = true;
        for (const filter of activeFilters) {
            if (!filter.test(creature)) {
                matchesAllFilters = false;
                break;
            }
        }
        if (matchesAllFilters) {
            if (creature.tableRow.style.display != "table-row")
                creature.tableRow.style.display = "table-row";
        }
        else {
            if (creature.tableRow.style.display != "none")
                creature.tableRow.style.display = "none";
        }
    }
}
function getFilterTypeFromValue(value) {
    switch (value) {
        case "equals": return FilterType.EQUALS;
        case "contains": return FilterType.CONTAINS;
        case "lessThan": return FilterType.LESS_THAN;
        case "lessThanEquals": return FilterType.LESS_THAN_EQUALS;
        case "greaterThan": return FilterType.GREATER_THAN;
        case "greaterThanEquals": return FilterType.GREATER_THAN_EQUALS;
        default: return null;
    }
}
function createOption(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
}
function onHeaderCellClick(headerCell) {
    const selectedSortingStat = selectedStats[headerCell.cellIndex];
    if (currentSortingStat == selectedSortingStat) {
        sortAscending = !sortAscending;
    }
    else {
        sortAscending = false;
    }
    currentSortingStat = selectedSortingStat;
    sortDirty = true;
    updateCreatureStatsTable().then(() => {
        updateHeaderCellArrow(headerCell);
    });
}
var lastSortedHeaderCell = null;
function findAndUpdateHeaderCellArrow() {
    const index = selectedStats.indexOf(currentSortingStat);
    if (index != -1) {
        const cells = STAT_LIST_TABLE.tHead.rows[0].cells;
        if (index < cells.length) {
            updateHeaderCellArrow(cells[index]);
        }
    }
}
function updateHeaderCellArrow(headerCell) {
    if (lastSortedHeaderCell != null)
        lastSortedHeaderCell.classList.remove("headerCellAscending", "headerCellDescending");
    lastSortedHeaderCell = headerCell;
    if (sortAscending) {
        headerCell.classList.add("headerCellAscending");
    }
    else {
        headerCell.classList.add("headerCellDescending");
    }
}
function openChooseTypeMenu(button) {
    if (statList.length == 0)
        return; //uninitialized
    button.parentElement.after(FLOATING_WINDOW);
    FLOATING_WINDOW_SEARCH_BAR.oninput = chooseTypeSearchBarUpdate;
    const rows = [];
    for (let i = 0; i < statList.length; i++) {
        const statValue = statList[i];
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.textContent = statValue.displayName;
        cell.setAttribute("class", "clickableButton");
        row.setAttribute("tabindex", "0");
        function onSelectStat() {
            closeFloatingWindow();
            button.value = String(i);
            button.textContent = statValue.displayName;
        }
        row.addEventListener("click", onSelectStat);
        row.addEventListener("keydown", (keyEvent) => {
            if (keyEvent.key == "Enter")
                onSelectStat();
        });
        row.appendChild(cell);
        rows.push(row);
    }
    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren(...rows);
    FLOATING_WINDOW.style.display = "block";
}
function chooseTypeSearchBarUpdate() {
    const searchTerm = FLOATING_WINDOW_SEARCH_BAR.value.toLowerCase();
    const tableRows = FLOATING_WINDOW_TABLE.querySelector("tbody").children;
    for (let i = 0; i < tableRows.length; i++) {
        const tableRow = tableRows[i];
        const textContent = tableRow.querySelector("td").textContent.toLowerCase();
        if (textContent.includes(searchTerm)) {
            tableRow.style.display = "table-row";
        }
        else {
            tableRow.style.display = "none";
        }
    }
}
function openConfigureTypesMenu() {
    if (statList.length == 0)
        return; //uninitialized
    CONFIGURE_STAT_TYPES_BUTTON.after(FLOATING_WINDOW);
    FLOATING_WINDOW_SEARCH_BAR.oninput = configureTypesSearchBarUpdate;
    const rows = [];
    const selectAllRow = document.createElement("tr");
    const cell = document.createElement("td");
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = selectedStats.length == statList.length;
    selectAllCheckbox.addEventListener("change", () => {
        if (STAT_LIST_TABLE.hasAttribute("disabled")) {
            selectAllCheckbox.checked = !selectAllCheckbox.checked;
            return;
        }
        if (selectAllCheckbox.checked) {
            for (const stat of statList) {
                if (!selectedStats.includes(stat))
                    selectedStats.push(stat);
            }
        }
        else {
            const keepEnabled = [];
            for (const stat of selectedStats) {
                if (stat.canBeDisabled == false)
                    keepEnabled.push(stat);
            }
            selectedStats = keepEnabled;
        }
        for (const row of FLOATING_WINDOW_TABLE.querySelector("tbody").rows) {
            var checkbox = row.querySelector("input");
            if (checkbox.disabled == false)
                checkbox.checked = selectAllCheckbox.checked;
        }
        updateCreatureStatsTable();
    });
    const label = document.createElement("label");
    label.setAttribute("style", "display: block; width: 100%;");
    label.append(selectAllCheckbox, "Show All");
    cell.appendChild(label);
    selectAllRow.appendChild(cell);
    rows.push(selectAllRow);
    for (let i = 0; i < statList.length; i++) {
        const statValue = statList[i];
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.disabled = !statValue.canBeDisabled;
        checkbox.checked = getSelectedStatValueWithKeyName(statValue.keyName) != null;
        checkbox.addEventListener("change", () => {
            if (STAT_LIST_TABLE.hasAttribute("disabled")) {
                checkbox.checked = !checkbox.checked;
                return;
            }
            const indexOfStatValue = selectedStats.indexOf(statValue);
            if (indexOfStatValue != -1) {
                selectedStats.splice(indexOfStatValue, 1);
            }
            else {
                selectedStats.push(statValue);
            }
            updateCreatureStatsTable();
        });
        const label = document.createElement("label");
        label.setAttribute("style", "display: block; width: 100%;");
        label.append(checkbox, statValue.displayName);
        cell.appendChild(label);
        row.appendChild(cell);
        rows.push(row);
    }
    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren(...rows);
    FLOATING_WINDOW.style.display = "block";
}
function configureTypesSearchBarUpdate() {
    const searchTerm = FLOATING_WINDOW_SEARCH_BAR.value.toLowerCase();
    const tableRows = FLOATING_WINDOW_TABLE.querySelector("tbody").children;
    for (let i = 0; i < tableRows.length; i++) {
        const tableRow = tableRows[i];
        const textContent = tableRow.querySelector("td").querySelector("label").textContent.toLowerCase();
        if (textContent.includes(searchTerm)) {
            tableRow.style.display = "table-row";
        }
        else {
            tableRow.style.display = "none";
        }
    }
}
function closeFloatingWindow() {
    FLOATING_WINDOW.style.display = "none";
    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren();
    FLOATING_WINDOW_SEARCH_BAR.oninput = null;
    FLOATING_WINDOW_SEARCH_BAR.value = "";
}
function onFrame(_) {
    STAT_LIST_TABLE.toggleAttribute('disabled', false);
    requestAnimationFrame(onFrame);
}
//@ts-ignore
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function onFinishedLoadingData() {
    updateCreatureStatsTable().then(() => {
        findAndUpdateHeaderCellArrow();
        document.documentElement.style.cursor = "";
        document.getElementById("loadingText")?.remove?.();
        const columnIndexOfNameStat = indexOfSelectedStat(nameStat);
        const nameHeaderCell = STAT_LIST_TABLE.tHead.rows[0].cells[columnIndexOfNameStat];
        if (nameHeaderCell != null) {
            nameHeaderCell.style.position = "sticky";
            nameHeaderCell.style.zIndex = "2";
            nameHeaderCell.style.left = "0px";
        }
        for (const row of STAT_LIST_TABLE.querySelector("tbody").rows) {
            const nameCell = row.cells[columnIndexOfNameStat];
            nameCell.style.backgroundColor = "inherit";
            nameCell.style.position = "sticky";
            nameCell.style.left = "0px";
        }
    });
}
(async () => {
    document.getElementById("loadingText").innerText = "LOADING TABLE...";
    let loadedItems = 0;
    initializeStatList().then(() => {
        nameStat = getStatValueWithKeyName("common");
        selectedStats.push(nameStat);
        selectedStats.push(getStatValueWithKeyName("type"));
        selectedStats.push(getStatValueWithKeyName("diet"));
        selectedStats.push(getStatValueWithKeyName("tier"));
        currentSortingStat = nameStat;
        sortAscending = false;
        sortDirty = true;
        if (++loadedItems == 2) {
            onFinishedLoadingData();
        }
    });
    initializeCreatureList().then(() => {
        if (++loadedItems == 2) {
            onFinishedLoadingData();
        }
    });
    const exitFloatingWindowButton = FLOATING_WINDOW.querySelector("img");
    exitFloatingWindowButton.addEventListener("click", closeFloatingWindow);
    exitFloatingWindowButton.addEventListener("keydown", (keyEvent) => { if (keyEvent.key == "Enter")
        closeFloatingWindow(); });
    CONFIGURE_STAT_TYPES_BUTTON.addEventListener("click", openConfigureTypesMenu);
    document.getElementById("applyFilters").addEventListener("click", () => {
        updateFilterChanges();
    });
    document.getElementById("createFilter").addEventListener("click", () => {
        FILTER_CONTAINING_DIV.appendChild(createFilter());
    });
    FILTER_CONTAINING_DIV.appendChild(createFilter());
    requestAnimationFrame(onFrame);
})();
window.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key == "Escape") {
        closeFloatingWindow();
    }
}, true);
STAT_LIST_TABLE.addEventListener("click", (mouseEvent) => {
    if (STAT_LIST_TABLE.hasAttribute("disabled"))
        return;
    const target = mouseEvent.target;
    let headerCell;
    if (target instanceof HTMLElement && (headerCell = target.closest('th')) != null) {
        onHeaderCellClick(headerCell);
    }
});
STAT_LIST_TABLE.addEventListener("keydown", (keyEvent) => {
    if (STAT_LIST_TABLE.hasAttribute("disabled"))
        return;
    if (!(keyEvent.target instanceof HTMLElement))
        return;
    const STAT_TABLE_BODY = STAT_LIST_TABLE.querySelector("tbody");
    if (keyEvent.target.closest("thead") != null) {
        let headerCell;
        if ((headerCell = keyEvent.target.closest('th')) && keyEvent.key == 'Enter') {
            onHeaderCellClick(headerCell);
        }
    }
    else if (keyEvent.target === STAT_LIST_TABLE) {
        function getFirstVisibleTableRow() {
            var children = STAT_TABLE_BODY.rows;
            for (const child of children) {
                if (child.style.display != "none") {
                    return child;
                }
            }
            return null;
        }
        switch (keyEvent.key) {
            case "Enter":
            case "ArrowRight":
            case "ArrowDown":
            case "ArrowLeft":
                keyEvent.preventDefault();
                const firstTableRow = getFirstVisibleTableRow();
                if (firstTableRow)
                    firstTableRow.firstElementChild.focus({ focusVisible: true });
        }
    }
    else if (keyEvent.target instanceof HTMLTableCellElement) {
        const target = keyEvent.target;
        function nextSiblingTillVisibleIsFound(element) {
            while (true) {
                element = element.nextElementSibling;
                if (element) {
                    if (element.style.display == "none")
                        continue;
                    else
                        return element;
                }
                else {
                    return null; //there's no more elements!
                }
            }
        }
        function prevSiblingTillVisibleIsFound(element) {
            while (true) {
                element = element.previousElementSibling;
                if (element) {
                    if (element.style.display == "none")
                        continue;
                    else
                        return element;
                }
                else {
                    return null; //there's no more elements!
                }
            }
        }
        function goToNeighboringCell(forward) {
            keyEvent.preventDefault();
            const nextCell = ((forward) ? target.nextElementSibling : target.previousElementSibling);
            if (nextCell)
                nextCell.focus({ focusVisible: true });
        }
        function goToNeighboringRow(forward) {
            keyEvent.preventDefault();
            const parentRow = target.parentElement;
            const nextRow = ((forward) ? nextSiblingTillVisibleIsFound(target.parentElement) : prevSiblingTillVisibleIsFound(target.parentElement));
            const currentChildIndex = Array.prototype.indexOf.call(parentRow.children, target);
            if (nextRow != null) {
                const cell = nextRow.children[currentChildIndex];
                if (cell != null) {
                    cell.focus({ focusVisible: true });
                }
            }
        }
        if (keyEvent.key == "ArrowRight") {
            goToNeighboringCell(true);
        }
        else if (keyEvent.key == "ArrowLeft") {
            goToNeighboringCell(false);
        }
        else if (keyEvent.key == "ArrowDown") {
            goToNeighboringRow(true);
        }
        else if (keyEvent.key == "ArrowUp") {
            goToNeighboringRow(false);
        }
        else if (keyEvent.key == "Enter" || (keyEvent.ctrlKey && keyEvent.key == 'c')) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNode(target);
            selection.removeAllRanges();
            selection.addRange(range);
            navigator.clipboard.writeText(target.textContent);
        }
    }
});
//# sourceMappingURL=cosStatList.js.map