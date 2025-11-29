"use strict";
var creatureList = [];
var creatureListFiltered = [];
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
var ON_MOBILE;
//@ts-ignore
if (navigator.userAgentData) {
    ON_MOBILE = navigator.userAgentData.mobile;
}
else {
    //@ts-expect-error
    let userAgent = navigator.userAgent || navigator.vendor || window.opera;
    /* cspell: disable-next-line */
    ON_MOBILE = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series([46])0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br([ev])w|bumb|bw-([nu])|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do([cp])o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly([-_])|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-([mpt])|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c([- _agpst])|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac([ \-\/])|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja([tv])a|jbro|jemu|jigs|kddi|keji|kgt([ \/])|klon|kpt |kwc-|kyo([ck])|le(no|xi)|lg( g|\/([klu])|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t([- ov])|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30([02])|n50([025])|n7(0([01])|10)|ne(([cm])-|on|tf|wf|wg|wt)|nok([6i])|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan([adt])|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c([-01])|47|mc|nd|ri)|sgh-|shar|sie([-m])|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel([im])|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c([- ])|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(userAgent.substring(0, 4)));
}
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
    static preferredInputAttributes() {
        return { type: "text", placeholder: "Enter text" };
    }
    preferredInputAttributes() {
        return StatValue.preferredInputAttributes();
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
    static preferredInputAttributes() {
        return { type: "text", placeholder: "Enter true or false" };
    }
    preferredInputAttributes() {
        return AbilityBooleanValue.preferredInputAttributes();
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
        testVal = testVal.toLowerCase();
        switch (filterType) {
            case 0 /* FilterType.EQUALS */:
                const inputTrue = testVal == "yes" || testVal == "true" || testVal == "t" || testVal == "";
                return this.getValue(creature) == inputTrue;
            case 1 /* FilterType.CONTAINS */: return this.getDisplayValue(creature).toLowerCase().includes(testVal);
            default: return false;
        }
    }
}
class NumberStatValue extends StatValue {
    constructor(keyName) {
        super(keyName);
    }
    static preferredInputAttributes() {
        return { type: "text", placeholder: "Enter a number or N/A" };
    }
    preferredInputAttributes() {
        return NumberStatValue.preferredInputAttributes();
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
            case 0 /* FilterType.EQUALS */: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
            case 1 /* FilterType.CONTAINS */: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
            case 2 /* FilterType.LESS_THAN */: return this.getValue(creature) < parseFloat(testVal);
            case 3 /* FilterType.LESS_THAN_EQUALS */: return this.getValue(creature) <= parseFloat(testVal);
            case 4 /* FilterType.GREATER_THAN */: return this.getValue(creature) > parseFloat(testVal);
            case 5 /* FilterType.GREATER_THAN_EQUALS */: return this.getValue(creature) >= parseFloat(testVal);
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
            if (indexOf == -1)
                return NaN;
        }
        let abilityNameEndIndex = indexOf + this.keyName.length;
        let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex) + 1, searchString.indexOf(")", abilityNameEndIndex));
        return parseFloat(abilityValue);
    }
}
class StringStatValue extends StatValue {
    constructor(keyName) {
        super(keyName);
    }
    static preferredInputAttributes() {
        return { type: "text", placeholder: "Enter text" };
    }
    preferredInputAttributes() {
        return StringStatValue.preferredInputAttributes();
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
            case 0 /* FilterType.EQUALS */: return this.getValue(creature).toLowerCase() == testVal.toLowerCase();
            case 1 /* FilterType.CONTAINS */: return this.getValue(creature).toLowerCase().includes(testVal.toLowerCase());
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
            if (indexOf == -1)
                return "N/A";
        }
        let abilityNameEndIndex = indexOf + this.keyName.length;
        // noinspection UnnecessaryLocalVariableJS
        let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex) + 1, searchString.indexOf(")", abilityNameEndIndex));
        return abilityValue;
    }
}
class DateStatValue extends StatValue {
    constructor(keyName) {
        super(keyName);
    }
    static preferredInputAttributes() {
        return { type: "date", placeholder: "Enter a date" };
    }
    preferredInputAttributes() {
        return DateStatValue.preferredInputAttributes();
    }
    sort(creature1, creature2) {
        const creature1Value = this.getValue(creature1);
        const creature2Value = this.getValue(creature2);
        return (sortAscending) ? creature1Value - creature2Value : creature2Value - creature1Value;
    }
    filter(creature, filterType, testVal) {
        const date = new Date(testVal + "T00:00").getTime(); //this.getDateStringAsNumber(testVal);
        switch (filterType) {
            case 0 /* FilterType.EQUALS */: return this.getValue(creature) == date;
            case 1 /* FilterType.CONTAINS */: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
            case 2 /* FilterType.LESS_THAN */: return this.getValue(creature) < date;
            case 3 /* FilterType.LESS_THAN_EQUALS */: return this.getValue(creature) <= date;
            case 4 /* FilterType.GREATER_THAN */: return this.getValue(creature) > date;
            case 5 /* FilterType.GREATER_THAN_EQUALS */: return this.getValue(creature) >= date;
            default: return false;
        }
    }
    getDateStringAsNumber(date) {
        const dateComponents = date.split("/", 3).map(comp => parseInt(comp));
        return new Date(dateComponents[2], dateComponents[0] - 1, dateComponents[1]).getTime();
    }
}
class KeyedDateStatValue extends DateStatValue {
    constructor(keyName) {
        super(keyName);
    }
    getDisplayValue(creature) {
        return creature[this.keyName];
    }
    getValue(creature) {
        return this.getDateStringAsNumber(this.getDisplayValue(creature));
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
                    case "date": //date is unimplemented so it is treated like a string
                        statValue = new KeyedDateStatValue(jsonStat.keyName);
                        break;
                    case "string":
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
                    case "date": //no abilities use the date type. there is no reason to implement this.
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
    // STAT_LIST_TABLE.tBodies[0].style.height = `${creatureList.length*22-2}px`
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
            newCell.setAttribute("class", "clickableButton creatureStatCell creatureStatHeaderCell");
            newCell.textContent = statValue.displayName;
            tableHeaderRow.appendChild(newCell);
            addStatValueToCreatureRows(statValue);
        }
    }
    findAndUpdateHeaderCellArrow();
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
    const selectStatButton = document.createElement("button"); //div.querySelector("button[name='statTypeSelect']")
    selectStatButton.name = "statTypeSelect";
    selectStatButton.type = "button";
    selectStatButton.value = "-1";
    selectStatButton.style.width = "28ch";
    selectStatButton.textContent = "SELECT STAT TYPE";
    selectStatButton.title = "Select a stat to filter!";
    const deleteFilterButton = document.createElement("button");
    deleteFilterButton.name = "deleteFilter";
    deleteFilterButton.type = "button";
    deleteFilterButton.textContent = "Delete";
    deleteFilterButton.addEventListener("click", () => {
        const containerElement = deleteFilterButton.closest("div");
        const nextElementSibling = containerElement.nextElementSibling;
        containerElement.remove();
        if (nextElementSibling?.id === "floatingWindow")
            closeFloatingWindow();
    });
    const select = document.createElement("select");
    select.name = "equalityType";
    select.title = "Choose what this stat should be!";
    select.addEventListener('change', () => updateFilterInput(div), true);
    select.append(createOption("equals", "EQUALS"), createOption("contains", "CONTAINS"), createOption("lessThan", "<"), createOption("lessThanEquals", "≤"), createOption("greaterThan", ">"), createOption("greaterThanEquals", "≥"));
    const textInput = document.createElement("input");
    textInput.autocomplete = "off";
    textInput.name = "statFilterInput";
    textInput.style.width = "20ch";
    setAttributes(textInput, StatValue.preferredInputAttributes());
    selectStatButton.addEventListener("click", () => {
        openChooseTypeMenu(selectStatButton, div);
    });
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
    div.append(selectStatButton, select, textInput, reverseLabel, activeLabel, deleteFilterButton);
    return div;
}
function updateFilterChanges() {
    var filterContainingDivs = FILTER_CONTAINING_DIV.children;
    activeFilters = [];
    for (const filterContainer of filterContainingDivs) {
        if (!(filterContainer instanceof HTMLDivElement) || filterContainer.id == "floatingWindow")
            continue;
        if (!filterContainer.querySelector("label[data-labelType='active']").querySelector("input[type='checkbox']").checked)
            continue;
        const statTypeIndex = Number(filterContainer.querySelector("button[name='statTypeSelect']").value);
        if (Number.isNaN(statTypeIndex) || statTypeIndex == -1)
            continue;
        const filterType = getFilterTypeFromValue(filterContainer.querySelector("select").selectedIndex); // const filterType = getFilterTypeFromValue(filterContainer.querySelector("select").value);
        if (filterType == null)
            continue;
        const inputtedText = filterContainer.querySelector("input[name='statFilterInput']").value;
        const reverseFilter = filterContainer.querySelector("label[data-labelType='reverse']").querySelector("input[type='checkbox']").checked;
        activeFilters.push(new Filter(statList[statTypeIndex], filterType, inputtedText, reverseFilter));
    }
    updateCreatureStatsTable();
}
function updateFilterInput(filterContainer) {
    const preferredInputAttributes = (getFilterTypeFromValue(filterContainer.querySelector("select").selectedIndex) == 1 /* FilterType.CONTAINS */) ? StatValue.preferredInputAttributes()
        : statList[Number(filterContainer.querySelector("button[name='statTypeSelect']").value)].preferredInputAttributes();
    setAttributes(filterContainer.querySelector("input[name='statFilterInput']"), preferredInputAttributes);
}
function filterCreatures() {
    creatureListFiltered = [];
    for (const creature of creatureList) {
        let matchesAllFilters = true;
        for (const filter of activeFilters) {
            if (!filter.test(creature)) {
                break;
            }
        }
        creatureListFiltered.push(creature);
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
    // switch(value){ case "equals": return FilterType.EQUALS; case "contains": return FilterType.CONTAINS; case "lessThan": return FilterType.LESS_THAN; case "lessThanEquals": return FilterType.LESS_THAN_EQUALS; case "greaterThan": return FilterType.GREATER_THAN; case "greaterThanEquals": return FilterType.GREATER_THAN_EQUALS; default: return null; }
    switch (value) {
        case 0: return 0 /* FilterType.EQUALS */;
        case 1: return 1 /* FilterType.CONTAINS */;
        case 2: return 2 /* FilterType.LESS_THAN */;
        case 3: return 3 /* FilterType.LESS_THAN_EQUALS */;
        case 4: return 4 /* FilterType.GREATER_THAN */;
        case 5: return 5 /* FilterType.GREATER_THAN_EQUALS */;
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
function openChooseTypeMenu(button, filterContainer) {
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
            const selectedStat = statList[i];
            button.value = String(i);
            button.textContent = selectedStat.displayName;
            updateFilterInput(filterContainer);
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
    FLOATING_WINDOW.focus();
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
        checkbox.name = statValue.displayName;
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
    FLOATING_WINDOW.focus();
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
//@ts-ignore
function setAttributes(element, attrs) { for (const key in attrs)
    element.setAttribute(key, attrs[key]); }
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
    }).then(() => STAT_LIST_TABLE.style.display = "");
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
    // if(ON_MOBILE){
    //     document.styleSheets[0].insertRule("td.creatureStatCell{user-select:all;}");
    // }
    requestAnimationFrame(onFrame);
})();
window.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key == "Escape") {
        closeFloatingWindow();
    }
    else {
        const target = keyEvent.target;
        if (keyEvent.key == "Enter" && target instanceof HTMLInputElement && target.type == "checkbox") {
            keyEvent.preventDefault();
            target.checked = !target.checked;
            target.dispatchEvent(new Event('change'));
        }
    }
});
STAT_LIST_TABLE.addEventListener("click", (mouseEvent) => {
    if (STAT_LIST_TABLE.hasAttribute("disabled"))
        return;
    const target = mouseEvent.target;
    let headerCell;
    if (target instanceof HTMLElement && (headerCell = target.closest('th')) != null) {
        onHeaderCellClick(headerCell);
    }
});
// STAT_LIST_TABLE.addEventListener("select", (event) => {
//     if(STAT_LIST_TABLE.hasAttribute("disabled")) return;
//     event.preventDefault()
//
//     const target = event.target;
//     let cell: HTMLTableCellElement;
//     if(target instanceof HTMLElement && (cell = target.closest('td')) != null){
//         selectTextInCell(cell);
//     }
// })
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
        else {
            const shouldCopy = keyEvent.ctrlKey && keyEvent.key == 'c';
            const shouldSelect = keyEvent.key == "Enter" || shouldCopy;
            if (!shouldSelect)
                return;
            selectTextInCell(target);
            if (shouldCopy)
                navigator.clipboard.writeText(target.textContent);
        }
    }
});
function selectTextInCell(cell) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNode(cell);
    selection.removeAllRanges();
    selection.addRange(range);
}
//# sourceMappingURL=cosStatList.js.map