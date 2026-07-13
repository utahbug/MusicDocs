"use strict";

const PDFJS_VERSION = "3.11.174";
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const STORAGE_KEYS = {
  deletedItems: "primaryMusicHelper.deletedItems",
  favorites: "primaryMusicHelper.favorites",
  importedItems: "primaryMusicHelper.importedItems",
  itemEdits: "primaryMusicHelper.itemEdits",
  lastOpened: "primaryMusicHelper.lastOpened",
  lists: "primaryMusicHelper.lists",
  pdfPages: "primaryMusicHelper.pdfPages",
  quickIndexes: "primaryMusicHelper.quickIndexes",
  recents: "primaryMusicHelper.recents",
  settings: "primaryMusicHelper.settings",
  starterFavorites: "primaryMusicHelper.starterFavorites",
  starterLists: "primaryMusicHelper.starterLists",
  setlists: "primaryMusicHelper.setlists",
  quickChecks: "primaryMusicHelper.quickChecks"
};

const IMPORT_DB_NAME = "primaryMusicHelper.imports";
const IMPORT_DB_VERSION = 1;
const PDF_STORE_NAME = "pdfFiles";
const RICH_TOGGLE_COMMANDS = ["bold", "italic", "strikeThrough", "insertUnorderedList", "insertOrderedList"];
const FAVORITE_DIVIDER_PREFIX = "favorite-divider:";
const FILE_ITEM_TYPES = new Set(["pdf", "image", "note", "index"]);
const LIBRARY_CONTENT_TYPES = new Set(["pdf", "image", "note", "index", "card", "link"]);

const BUILT_IN_LINKS = [];

const DEFAULT_LIBRARY_DATA = {
  items: [
    {
      id: "amazing-grace-ken-roberts",
      title: "Amazing Grace",
      type: "pdf",
      category: "Ken Roberts",
      composer: "Ken Roberts",
      file: "music/Ken-Roberts/Amazing-Grace-Ken-Roberts.pdf",
      tags: ["arrangement", "demo"],
      notes: "Starter example arrangement by Ken Roberts."
    },
    {
      id: "love-at-home-ken-roberts",
      title: "Love at Home",
      type: "pdf",
      category: "Ken Roberts",
      composer: "Ken Roberts",
      file: "music/Ken-Roberts/Love-at-Home-Ken-Roberts.pdf",
      tags: ["arrangement", "demo"],
      notes: "Starter example arrangement by Ken Roberts."
    },
    {
      id: "lds-hymnal",
      title: "Hymnal",
      type: "link",
      category: "LDS Library",
      url: "https://www.churchofjesuschrist.org/media/music/collections/hymns?lang=eng",
      tags: ["church", "music", "hymns"],
      notes: "Official Church hymn collection."
    },
    {
      id: "lds-new-hymns",
      title: "New Hymns",
      type: "link",
      category: "LDS Library",
      url: "https://www.churchofjesuschrist.org/media/music/collections/hymns-for-home-and-church?lang=eng",
      tags: ["church", "music", "hymns"],
      notes: "Official Hymns for Home and Church collection."
    },
    {
      id: "lds-childrens-songbook",
      title: "Children's Songbook",
      type: "link",
      category: "LDS Library",
      url: "https://www.churchofjesuschrist.org/media/music/collections/childrens-songbook?lang=eng",
      tags: ["church", "music", "children"],
      notes: "Official Children's Songbook collection."
    },
    {
      id: "lds-music-and-children",
      title: "Music and Children",
      type: "link",
      category: "LDS Library",
      url: "https://www.churchofjesuschrist.org/media/music/collections/featured-music-for-children?lang=eng",
      tags: ["church", "music", "children"],
      notes: "Official featured music for children collection."
    },
    {
      id: "lds-choir-and-voice",
      title: "Choir and Voice",
      type: "link",
      category: "LDS Library",
      url: "https://www.churchofjesuschrist.org/media/music/music-for-choir-and-voice?lang=eng",
      tags: ["church", "music", "choir", "voice"],
      notes: "Official Church choir and voice music page."
    }
  ],
  favorites: ["amazing-grace-ken-roberts"],
  quickIndexes: [],
  setlists: [
    {
      id: "lds-library",
      title: "LDS Library",
      items: [
        { itemId: "lds-hymnal" },
        { itemId: "lds-new-hymns" },
        { itemId: "lds-childrens-songbook" },
        { itemId: "lds-music-and-children" },
        { itemId: "lds-choir-and-voice" }
      ]
    }
  ]
};

const THEME_PRESETS = {
  blue: {
    label: "Blue",
    primary: "#2B5F9E",
    dark: "#214A78",
    light: "#EAF2FB",
    hover: "#D8E7F7",
    border: "#B7CCE0"
  },
  teal: {
    label: "Teal",
    primary: "#046983",
    dark: "#03576D",
    light: "#E6F2F5",
    hover: "#D2E7ED",
    border: "#B6CCD4"
  },
  slate: {
    label: "Slate",
    primary: "#4D6573",
    dark: "#3C505C",
    light: "#EDF3F5",
    hover: "#DCE8EC",
    border: "#BCCBD0"
  },
  green: {
    label: "Green",
    primary: "#4D7358",
    dark: "#3D5B46",
    light: "#EDF5EF",
    hover: "#DCEBDD",
    border: "#BED1C2"
  },
  burgundy: {
    label: "Burgundy",
    primary: "#7B3F4A",
    dark: "#62333C",
    light: "#F6EAEC",
    hover: "#EBD7DB",
    border: "#D2B8BE"
  },
  pink: {
    label: "Pink",
    primary: "#B64F7C",
    dark: "#923E64",
    light: "#F8EAF1",
    hover: "#F0D3E1",
    border: "#DDB7C9"
  },
  gold: {
    label: "Gold",
    primary: "#8B6F35",
    dark: "#70592A",
    light: "#F7F1E5",
    hover: "#ECE0C7",
    border: "#D5C39B"
  }
};

const state = {
  data: { items: [], quickIndexes: [], setlists: [] },
  itemsById: new Map(),
  favorites: new Set(),
  lists: [],
  listEditMode: false,
  listPickerOpen: false,
  listPickerMessage: "",
  favoriteReorderMode: false,
  editingListId: "",
  editingItemId: null,
  importContext: "library",
  importReturnSection: "",
  modalDrag: null,
  cardEditorRange: null,
  activeSection: "library",
  previousSection: "library",
  activeListId: "",
  expandedListId: "",
  swipe: {
    row: null,
    startX: 0,
    startY: 0,
    wasSwipe: false,
    suppressClick: false
  },
  favoriteDrag: {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false
  },
  currentPdf: {
    item: null,
    doc: null,
    objectUrl: null,
    pageNumber: 1,
    pageCount: 0,
    rendering: false,
    pendingPage: null,
    touchStartX: 0,
    touchStartY: 0,
    touchMode: "",
    touchMoved: false,
    touchStartDistance: 0,
    touchStartCenterX: 0,
    touchStartCenterY: 0,
    touchStartZoom: 1,
    touchStartPanX: 0,
    touchStartPanY: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    suppressClick: false
  }
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  collectElements();
  applyAppSettings();
  wireEvents();
  configurePdfJs();
  await loadLibrary();
  loadLocalState();
  setupInitialSelections();
  renderAll();
  openInitialSection();
  setupServiceWorker();
}

function collectElements() {
  el.appShell = document.getElementById("appShell");
  el.homeTitleButton = document.getElementById("homeTitleButton");
  el.navButtons = Array.from(document.querySelectorAll(".nav-button"));
  el.overflowMenuButton = document.getElementById("overflowMenuButton");
  el.overflowMenu = document.getElementById("overflowMenu");

  el.sections = {
    library: document.getElementById("librarySection"),
    lists: document.getElementById("listsSection"),
    cards: document.getElementById("cardsSection"),
    links: document.getElementById("linksSection"),
    favorites: document.getElementById("favoritesSection"),
    search: document.getElementById("searchSection"),
    detail: document.getElementById("detailSection")
  };

  el.libraryContent = document.getElementById("libraryContent");
  el.librarySearch = document.getElementById("librarySearch");
  el.librarySort = document.getElementById("librarySort");
  el.libraryTopAddButton = document.getElementById("libraryTopAddButton");
  el.libraryAddButton = document.getElementById("libraryAddButton");
  el.exportBackupButton = document.getElementById("exportBackupButton");
  el.importBackupButton = document.getElementById("importBackupButton");
  el.backupFileInput = document.getElementById("backupFileInput");

  el.listSelect = document.getElementById("listSelect");
  el.listTabs = document.getElementById("listTabs");
  el.listTopAddButton = document.getElementById("listTopAddButton");
  el.listEditButton = document.getElementById("listEditButton");
  el.listMoreButton = document.getElementById("listMoreButton");
  el.listMoreMenu = document.getElementById("listMoreMenu");
  el.listEditorPanel = document.getElementById("listEditorPanel");
  el.listContent = document.getElementById("listContent");
  el.listItemAddButton = document.getElementById("listItemAddButton");
  el.listPickerPanel = document.getElementById("listPickerPanel");

  el.cardsContent = document.getElementById("cardsContent");
  el.cardTopAddButton = document.getElementById("cardTopAddButton");
  el.cardAddButton = document.getElementById("cardAddButton");
  el.linksContent = document.getElementById("linksContent");
  el.linkTopAddButton = document.getElementById("linkTopAddButton");
  el.linkAddButton = document.getElementById("linkAddButton");
  el.favoritesContent = document.getElementById("favoritesContent");
  el.favoritesReorderButton = document.getElementById("favoritesReorderButton");
  el.favoriteDividerAddButton = document.getElementById("favoriteDividerAddButton");
  el.globalSearch = document.getElementById("globalSearch");
  el.searchContent = document.getElementById("searchContent");

  el.detailContent = document.getElementById("detailContent");

  el.pdfViewer = document.getElementById("pdfViewer");
  el.pdfPrevButton = document.getElementById("pdfPrevButton");
  el.pdfNextButton = document.getElementById("pdfNextButton");
  el.pdfTitle = document.getElementById("pdfTitle");
  el.pdfPageStatus = document.getElementById("pdfPageStatus");
  el.pdfStage = document.getElementById("pdfStage");
  el.pdfLoading = document.getElementById("pdfLoading");
  el.pdfCanvas = document.getElementById("pdfCanvas");
  el.pdfTapLeft = document.getElementById("pdfTapLeft");
  el.pdfTapRight = document.getElementById("pdfTapRight");

  el.importModal = document.getElementById("importModal");
  el.modalPanel = document.getElementById("modalPanel");
  el.modalHeading = document.getElementById("modalHeading");
  el.importForm = document.getElementById("importForm");
  el.importCloseButton = document.getElementById("importCloseButton");
  el.importType = document.getElementById("importType");
  el.importTypeRow = document.getElementById("importTypeRow");
  el.pdfImportFields = document.getElementById("pdfImportFields");
  el.importFileLabel = document.getElementById("importFileLabel");
  el.cardImportFields = document.getElementById("cardImportFields");
  el.linkImportFields = document.getElementById("linkImportFields");
  el.importPdfFile = document.getElementById("importPdfFile");
  el.importPdfFileName = document.getElementById("importPdfFileName");
  el.importCardContent = document.getElementById("importCardContent");
  el.importCardEditor = document.getElementById("importCardEditor");
  el.inlineCardImageInput = document.getElementById("inlineCardImageInput");
  el.importPlainContent = document.getElementById("importPlainContent");
  el.richCardContentRow = document.getElementById("richCardContentRow");
  el.plainCardContentRow = document.getElementById("plainCardContentRow");
  el.cardFormatToolbar = document.getElementById("cardFormatToolbar");
  el.importCardImageRow = document.getElementById("importCardImageRow");
  el.importCardImage = document.getElementById("importCardImage");
  el.importCardImageName = document.getElementById("importCardImageName");
  el.importUrl = document.getElementById("importUrl");
  el.importTitleRow = document.getElementById("importTitleRow");
  el.importTitleLabel = document.getElementById("importTitleLabel");
  el.importTitleField = document.getElementById("importTitleField");
  el.importCategoryRow = document.getElementById("importCategoryRow");
  el.importCategory = document.getElementById("importCategory");
  el.importBookRow = document.getElementById("importBookRow");
  el.importBook = document.getElementById("importBook");
  el.importComposerRow = document.getElementById("importComposerRow");
  el.importComposer = document.getElementById("importComposer");
  el.importPageRow = document.getElementById("importPageRow");
  el.importPage = document.getElementById("importPage");
  el.importTagsRow = document.getElementById("importTagsRow");
  el.importTags = document.getElementById("importTags");
  el.importNotesRow = document.getElementById("importNotesRow");
  el.importNotes = document.getElementById("importNotes");
  el.importStatus = document.getElementById("importStatus");
  el.importDialogTitle = document.getElementById("importTitle");
  el.importSaveButton = document.getElementById("importSaveButton");
  el.importDeleteButton = document.getElementById("importDeleteButton");

  el.listEditModal = document.getElementById("listEditModal");
  el.listEditPanel = document.getElementById("listEditPanel");
  el.listEditForm = document.getElementById("listEditForm");
  el.listEditCloseButton = document.getElementById("listEditCloseButton");
  el.listEditTitle = document.getElementById("listEditTitle");
  el.listEditTitleField = document.getElementById("listEditTitleField");
  el.listEditItems = document.getElementById("listEditItems");
  el.listEditSearch = document.getElementById("listEditSearch");
  el.listEditStatus = document.getElementById("listEditStatus");
  el.listEditResults = document.getElementById("listEditResults");

  el.settingsModal = document.getElementById("settingsModal");
  el.settingsPanel = document.getElementById("settingsPanel");
  el.settingsCloseButton = document.getElementById("settingsCloseButton");
  el.settingsThemeChoices = document.getElementById("settingsThemeChoices");

  el.helpModal = document.getElementById("helpModal");
  el.helpPanel = document.getElementById("helpPanel");
  el.helpCloseButton = document.getElementById("helpCloseButton");

  el.aboutModal = document.getElementById("aboutModal");
  el.aboutPanel = document.getElementById("aboutPanel");
  el.aboutCloseButton = document.getElementById("aboutCloseButton");
}

function wireEvents() {
  el.homeTitleButton.addEventListener("click", goHome);

  el.navButtons.forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });

  el.libraryAddButton.addEventListener("click", () => openImportModal(null, "pdf", "library"));
  el.libraryTopAddButton.addEventListener("click", () => openImportModal(null, "pdf", "library"));
  el.cardAddButton.addEventListener("click", () => openImportModal(null, "card", "cards"));
  el.cardTopAddButton.addEventListener("click", () => openImportModal(null, "card", "cards"));
  el.linkAddButton.addEventListener("click", () => openImportModal(null, "link", "links"));
  el.linkTopAddButton.addEventListener("click", () => openImportModal(null, "link", "links"));
  el.favoritesReorderButton.addEventListener("click", toggleFavoriteReorderMode);
  el.favoriteDividerAddButton.addEventListener("click", addFavoriteDivider);
  el.overflowMenuButton.addEventListener("click", toggleOverflowMenu);
  el.listMoreButton.addEventListener("click", toggleListMoreMenu);
  el.exportBackupButton.addEventListener("click", () => {
    closeOverflowMenu();
    exportBackup();
  });
  el.importBackupButton.addEventListener("click", () => {
    closeOverflowMenu();
    el.backupFileInput.click();
  });
  el.backupFileInput.addEventListener("change", importBackupFromFile);
  el.importCloseButton.addEventListener("click", closeImportModal);
  el.importDeleteButton.addEventListener("click", handleDeleteItemFromForm);
  el.importType.addEventListener("change", updateImportTypeFields);
  el.importPdfFile.addEventListener("change", () => {
    updateFilePickerName(el.importPdfFile, el.importPdfFileName);
    fillTitleFromPdfFile();
  });
  el.importCardImage.addEventListener("change", () => updateFilePickerName(el.importCardImage, el.importCardImageName, "(optional)"));
  el.inlineCardImageInput.addEventListener("change", handleInlineCardImageSelected);
  el.cardFormatToolbar.addEventListener("mousedown", (event) => event.preventDefault());
  el.cardFormatToolbar.addEventListener("click", handleRichToolbarClick);
  ["keyup", "mouseup", "focus", "input"].forEach((eventName) => {
    el.importCardEditor.addEventListener(eventName, updateRichToolbarState);
  });
  el.importCardEditor.addEventListener("click", handleCardEditorClick);
  el.importCardEditor.addEventListener("input", syncCardEditorToHiddenField);
  el.importForm.addEventListener("submit", handleImportSubmit);
  el.listEditCloseButton.addEventListener("click", closeListEditModal);
  el.listEditForm.addEventListener("submit", saveListEditModal);
  el.settingsCloseButton.addEventListener("click", closeSettingsModal);
  el.settingsThemeChoices.addEventListener("change", handleSettingsThemeChange);
  el.helpCloseButton.addEventListener("click", closeHelpModal);
  el.aboutCloseButton.addEventListener("click", closeAboutModal);
  el.modalHeading.addEventListener("pointerdown", startModalDrag);
  window.addEventListener("pointermove", moveModalDrag);
  window.addEventListener("pointerup", endModalDrag);

  el.librarySearch.addEventListener("input", renderLibrary);
  el.librarySort.addEventListener("change", renderLibrary);
  el.listSelect.addEventListener("change", () => {
    state.activeListId = el.listSelect.value;
    state.listPickerOpen = false;
    state.listPickerMessage = "";
    state.listEditMode = false;
    renderLists();
  });
  el.listTopAddButton.addEventListener("click", () => {
    closeListMoreMenu();
    createList();
  });
  el.listEditButton.addEventListener("click", toggleListEditMode);
  el.listItemAddButton.addEventListener("click", toggleListPicker);
  el.globalSearch.addEventListener("input", renderSearch);
  document.body.addEventListener("click", handleBodyClick);
  document.body.addEventListener("input", handleBodyInput);
  document.body.addEventListener("change", handleBodyChange);
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("selectionchange", updateRichToolbarState);
  document.body.addEventListener("pointerdown", handleFavoriteDragPointerDown);
  document.body.addEventListener("pointermove", handleFavoriteDragPointerMove, { passive: false });
  document.body.addEventListener("pointerup", handleFavoriteDragPointerUp);
  document.body.addEventListener("pointercancel", handleFavoriteDragPointerCancel);
  document.body.addEventListener("pointerdown", handleSwipePointerDown);
  document.body.addEventListener("pointermove", handleSwipePointerMove, { passive: false });
  document.body.addEventListener("pointerup", handleSwipePointerUp);
  document.body.addEventListener("pointercancel", handleSwipePointerUp);

  el.pdfPrevButton.addEventListener("click", previousPdfPage);
  el.pdfNextButton.addEventListener("click", nextPdfPage);

  el.pdfTapLeft.addEventListener("click", (event) => handlePdfTapZoneClick(event, "previous"));
  el.pdfTapRight.addEventListener("click", (event) => handlePdfTapZoneClick(event, "next"));

  el.pdfStage.addEventListener("touchstart", handlePdfTouchStart, { passive: false });
  el.pdfStage.addEventListener("touchmove", handlePdfTouchMove, { passive: false });
  el.pdfStage.addEventListener("touchend", handlePdfTouchEnd, { passive: false });
  el.pdfStage.addEventListener("touchcancel", handlePdfTouchEnd, { passive: false });
  window.addEventListener("hashchange", showSectionFromHash);
  const handleViewportChange = debounce(() => {
    if (!el.pdfViewer.classList.contains("hidden") && state.currentPdf.doc) {
      renderPdfPage(state.currentPdf.pageNumber);
    }
    fitOpenMobileModals();
  }, 150);
  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);
}

function toggleOverflowMenu(event) {
  event?.stopPropagation();
  const isOpening = el.overflowMenu.classList.contains("hidden");
  if (isOpening) {
    el.overflowMenu.classList.remove("hidden");
    el.overflowMenuButton.setAttribute("aria-expanded", "true");
    clearNavHighlight();
    el.overflowMenuButton.classList.add("active");
  } else {
    closeOverflowMenu();
  }
  closeListMoreMenu();
}

function closeOverflowMenu({ restoreActive = true } = {}) {
  el.overflowMenu.classList.add("hidden");
  el.overflowMenuButton.setAttribute("aria-expanded", "false");
  if (restoreActive) {
    setNavHighlight(state.activeSection);
  }
}

function openSettingsModal() {
  renderSettingsThemeChoices();
  closeOverflowMenu();
  el.settingsModal.classList.remove("hidden");
  fitOpenMobileModals();
}

function closeSettingsModal() {
  el.settingsModal.classList.add("hidden");
  fitOpenMobileModals();
}

function openHelpModal() {
  closeOverflowMenu();
  el.helpModal.classList.remove("hidden");
  fitOpenMobileModals();
}

function closeHelpModal() {
  el.helpModal.classList.add("hidden");
  fitOpenMobileModals();
}

function openAboutModal() {
  closeOverflowMenu();
  el.aboutModal.classList.remove("hidden");
  fitOpenMobileModals();
}

function closeAboutModal() {
  el.aboutModal.classList.add("hidden");
  fitOpenMobileModals();
}

async function refreshAppShell() {
  closeOverflowMenu();
  closeListMoreMenu();

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("primary-music-helper-shell"))
          .map((key) => caches.delete(key))
      );
    }

    if (navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    }
  } catch {
    // Refresh should still reload the page even if cache cleanup is unavailable.
  }

  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString(36));
  window.location.replace(url.toString());
}

function renderSettingsThemeChoices() {
  const settings = readJson(STORAGE_KEYS.settings, {});
  const activeTheme = settings.tabTheme && THEME_PRESETS[settings.tabTheme] ? settings.tabTheme : "blue";
  el.settingsThemeChoices.innerHTML = Object.entries(THEME_PRESETS).map(([key, theme]) => `
    <label class="theme-choice">
      <input type="radio" name="tabTheme" value="${escapeHtml(key)}" ${key === activeTheme ? "checked" : ""}>
      <span class="theme-swatch" style="--swatch-color: ${escapeHtml(theme.primary)}" aria-hidden="true"></span>
      <span>${escapeHtml(theme.label)}</span>
    </label>
  `).join("");
}

function handleSettingsThemeChange(event) {
  if (event.target.name !== "tabTheme") return;
  const tabTheme = THEME_PRESETS[event.target.value] ? event.target.value : "blue";
  const settings = {
    ...readJson(STORAGE_KEYS.settings, {}),
    tabTheme
  };
  writeJson(STORAGE_KEYS.settings, settings);
  applyAppSettings(settings);
}

function applyAppSettings(settings = readJson(STORAGE_KEYS.settings, {})) {
  const themeName = settings.tabTheme && THEME_PRESETS[settings.tabTheme] ? settings.tabTheme : "blue";
  const theme = THEME_PRESETS[themeName];
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-primary-dark", theme.dark);
  root.style.setProperty("--color-primary-light", theme.light);
  root.style.setProperty("--color-primary-hover", theme.hover);
  root.style.setProperty("--color-border", theme.border);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.primary);
  updateNavPlacement();
}

function updateNavPlacement() {
  document.body.classList.remove("nav-bottom");
  const settings = readJson(STORAGE_KEYS.settings, {});
  if (settings.menuPlacement) {
    const { menuPlacement, ...nextSettings } = settings;
    writeJson(STORAGE_KEYS.settings, nextSettings);
  }
}

function clearNavHighlight() {
  el.navButtons.forEach((button) => button.classList.remove("active"));
}

function setNavHighlight(sectionName) {
  el.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionName);
  });
  el.overflowMenuButton.classList.toggle("active", sectionName === "search");
}

function toggleListMoreMenu(event) {
  event?.stopPropagation();
  const isOpening = el.listMoreMenu.classList.contains("hidden");
  el.listMoreMenu.classList.toggle("hidden", !isOpening);
  el.listMoreButton.setAttribute("aria-expanded", String(isOpening));
  closeOverflowMenu();
}

function closeListMoreMenu() {
  el.listMoreMenu.classList.add("hidden");
  el.listMoreButton.setAttribute("aria-expanded", "false");
}

function handleDocumentKeydown(event) {
  if (event.key !== "Escape") return;
  closeOverflowMenu();
  closeListMoreMenu();
  closeListEditModal();
  closeSettingsModal();
  closeHelpModal();
  closeAboutModal();
}

function favoriteIconHtml(id) {
  return state.favorites.has(id) ? "&#9733;" : "&#9734;";
}

function isFavoriteDividerId(id) {
  return typeof id === "string" && id.startsWith(FAVORITE_DIVIDER_PREFIX);
}

function setFavoriteIcons(container) {
  container.querySelectorAll(".favorite-toggle").forEach((button) => {
    button.innerHTML = favoriteIconHtml(button.dataset.favorite);
  });
}

function hydrateLocalImages(container) {
  container.querySelectorAll("[data-image-file-id]").forEach(async (slot) => {
    if (slot.dataset.loaded) return;
    slot.dataset.loaded = "true";
    try {
      const file = await getLocalFile(slot.dataset.imageFileId);
      if (!file) {
        slot.innerHTML = `<p class="quick-meta">Image not found on this device.</p>`;
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.alt = slot.dataset.imageAlt || "Card image";
      img.onload = () => URL.revokeObjectURL(url);
      img.src = url;
      slot.replaceChildren(img);
    } catch {
      slot.innerHTML = `<p class="quick-meta">Image could not be loaded.</p>`;
    }
  });
}

function configurePdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  } else {
    window.addEventListener("load", () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      }
    });
  }
}

async function loadLibrary() {
  let libraryData = null;
  try {
    const response = await fetch("library.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`library.json returned ${response.status}`);
    }
    libraryData = await response.json();
  } catch (error) {
    // Some browsers block fetch("library.json") when index.html is opened directly
    // from a folder. Keep a small starter copy here so extracted ZIPs still work.
    libraryData = cloneData(DEFAULT_LIBRARY_DATA);
  }

  state.data = libraryData || cloneData(DEFAULT_LIBRARY_DATA);
  const importedItems = cleanupImportedItemDuplicates();
  const baseItems = [
    ...(state.data.items || []),
    ...BUILT_IN_LINKS,
    ...importedItems
  ].filter((item) => item?.id && !deletedItemIds().has(item.id));
  state.data.items = applyLocalItemEdits(baseItems);
  state.itemsById = new Map(state.data.items.map((item) => [item.id, item]));
}

function showLoadError(error) {
  const message = `
    <div class="empty-state">
      <p>library.json could not be loaded. Run this app from a small local web server, then refresh.</p>
      <p class="quick-meta">${escapeHtml(error.message)}</p>
    </div>
  `;
  el.libraryContent.innerHTML = message;
  el.listContent.innerHTML = message;
  el.cardsContent.innerHTML = message;
  el.favoritesContent.innerHTML = message;
  el.searchContent.innerHTML = message;
}

function loadLocalState() {
  // localStorage keeps private, device-only preferences and planning state.
  // Clearing browser site data resets these values without changing library.json.
  state.favorites = new Set(readJson(STORAGE_KEYS.favorites, []));
  applyStarterFavorites();
  state.lists = loadUnifiedLists();
}

function applyStarterFavorites() {
  const starterFavorites = Array.isArray(state.data.favorites) ? state.data.favorites : [];
  if (!starterFavorites.length) return;

  const applied = new Set(readJson(STORAGE_KEYS.starterFavorites, []));
  let favoritesChanged = false;
  let appliedChanged = false;

  starterFavorites.forEach((id) => {
    if (applied.has(id) || !state.itemsById.has(id)) return;
    state.favorites.add(id);
    applied.add(id);
    favoritesChanged = true;
    appliedChanged = true;
  });

  if (favoritesChanged) writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));
  if (appliedChanged) writeJson(STORAGE_KEYS.starterFavorites, Array.from(applied));
}

function loadUnifiedLists() {
  const savedLists = readJson(STORAGE_KEYS.lists, null);
  if (Array.isArray(savedLists) && savedLists.length) {
    return syncStarterLists(pruneOldEmptyListShells(normalizeLists(savedLists), true));
  }

  const quickChecks = readJson(STORAGE_KEYS.quickChecks, {});
  const quickIndexes = readJson(STORAGE_KEYS.quickIndexes, state.data.quickIndexes || []);
  const setlists = readJson(STORAGE_KEYS.setlists, state.data.setlists || []);
  const migrated = [
    ...quickIndexes.map((list) => ({
      id: `quick-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      entries: (list.entries || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(quickChecks[`${list.id}:${entry.itemId}`])
      }))
    })),
    ...setlists.map((list) => ({
      id: `setlist-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: true,
      entries: (list.items || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(entry.checked)
      }))
    }))
  ];

  const lists = syncStarterLists(normalizeLists(migrated));
  writeJson(STORAGE_KEYS.lists, lists);
  return lists;
}

function syncStarterLists(lists) {
  const starterLists = starterUnifiedLists();
  if (!starterLists.length) return lists;

  const applied = new Set(readJson(STORAGE_KEYS.starterLists, []));
  const listById = new Map(lists.map((list) => [list.id, list]));
  let listsChanged = false;
  let appliedChanged = false;

  starterLists.forEach((starter) => {
    const starterEntries = (starter.entries || []).filter((entry) => state.itemsById.has(entry.itemId));
    if (applied.has(starter.id) || !starterEntries.length) return;

    const existing = listById.get(starter.id);
    if (existing) {
      const existingItems = new Set((existing.entries || []).map((entry) => entry.itemId));
      starterEntries.forEach((entry) => {
        if (existingItems.has(entry.itemId)) return;
        existing.entries.push({ ...entry });
        listsChanged = true;
      });
    } else {
      const merged = { ...starter, entries: starterEntries.map((entry) => ({ ...entry })) };
      lists.push(merged);
      listById.set(merged.id, merged);
      listsChanged = true;
    }

    applied.add(starter.id);
    appliedChanged = true;
  });

  if (appliedChanged) writeJson(STORAGE_KEYS.starterLists, Array.from(applied));
  if (listsChanged) writeJson(STORAGE_KEYS.lists, lists);
  return lists;
}

function starterUnifiedLists() {
  return normalizeLists([
    ...(state.data.quickIndexes || []).map((list) => ({
      id: `quick-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      entries: (list.entries || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(entry.checked)
      }))
    })),
    ...(state.data.setlists || []).map((list) => ({
      id: `setlist-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      entries: (list.items || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(entry.checked)
      }))
    }))
  ]);
}

function normalizeLists(lists) {
  const normalized = (lists || [])
    .filter((list) => list && list.id)
    .map((list) => ({
      id: String(list.id),
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      userCreated: Boolean(list.userCreated || list.createdEmpty),
      entries: (list.entries || list.items || [])
        .filter((entry) => entry?.itemId)
        .map((entry) => ({
          itemId: entry.itemId,
          page: entry.page || null,
          book: entry.book || "",
          notes: entry.notes || "",
          order: entry.order || null,
          checked: Boolean(entry.checked)
        }))
    }));

  return normalized;
}

function pruneOldEmptyListShells(lists, persist = false) {
  if (state.itemsById.size) return lists;

  const pruned = lists.filter((list) => (list.entries || []).length || list.userCreated);
  if (persist && pruned.length !== lists.length) {
    writeJson(STORAGE_KEYS.lists, pruned);
  }
  return pruned;
}

function setupInitialSelections() {
  populateSelect(el.listSelect, state.lists || []);
  state.activeListId = state.lists[0]?.id || "";
  el.listSelect.value = state.activeListId;
}

function populateSelect(select, options) {
  select.innerHTML = "";
  if (!options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No lists yet";
    select.appendChild(opt);
    return;
  }
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.id;
    opt.textContent = option.title;
    select.appendChild(opt);
  });
}

function openInitialSection() {
  if (!showSectionFromHash()) {
    showSection("favorites");
  }
}

function showSectionFromHash() {
  const hashSection = window.location.hash.replace("#", "");
  const mappedSection = hashSection === "quick" || hashSection === "setlists"
    ? "lists"
    : hashSection === "all"
      ? "library"
      : hashSection;
  if (mappedSection !== "lists" && !el.sections[mappedSection]) return false;
  showSection(mappedSection);
  return true;
}

function setupServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then((registration) => {
      registration.update();
    }).catch(() => {
      // The app still works as a normal static site if service workers are unavailable.
    });
  }
}

function openImportModal(itemId = null, preferredType = "pdf", context = "library") {
  state.editingItemId = itemId;
  state.importContext = context;
  state.importReturnSection = itemId && context === "lists" ? "lists" : "";
  resetImportForm();
  if (itemId) {
    const item = state.itemsById.get(itemId);
    state.importContext = context === "lists"
      ? "lists"
      : item?.type === "card"
        ? "cards"
        : item?.type === "link"
          ? "links"
          : "library";
    prefillImportForm(item);
  } else {
    el.importType.value = preferredType;
  }
  applyImportContext();
  updateImportTypeFields();
  clearModalPanelLayout(el.modalPanel);
  el.importModal.classList.remove("hidden");
  fitOpenMobileModals();
  el.importTitleField.focus();
}

function closeImportModal() {
  el.importModal.classList.add("hidden");
  clearModalPanelLayout(el.modalPanel);
  state.editingItemId = null;
  state.importContext = "library";
  state.importReturnSection = "";
  el.importType.disabled = false;
  setImportStatus("");
  fitOpenMobileModals();
}

function clearModalPanelLayout(panel) {
  if (!panel) return;
  [
    "position",
    "left",
    "right",
    "top",
    "bottom",
    "margin",
    "width",
    "maxWidth",
    "height",
    "maxHeight"
  ].forEach((name) => {
    panel.style[name] = "";
  });
}

function fitOpenMobileModals() {
  const openPanels = [
    [el.importModal, el.modalPanel],
    [el.listEditModal, el.listEditPanel],
    [el.settingsModal, el.settingsPanel],
    [el.helpModal, el.helpPanel],
    [el.aboutModal, el.aboutPanel]
  ].filter(([modal, panel]) => modal && panel && !modal.classList.contains("hidden"));

  const shouldFit = window.matchMedia("(max-width: 760px)").matches;
  document.body.classList.toggle("modal-open", shouldFit && openPanels.length > 0);

  if (!shouldFit) {
    openPanels.forEach(([, panel]) => clearModalPanelLayout(panel));
    return;
  }

  const viewport = window.visualViewport;
  const width = Math.floor(viewport?.width || document.documentElement.clientWidth || window.innerWidth);
  const height = Math.floor(viewport?.height || window.innerHeight);
  const left = Math.floor(viewport?.offsetLeft || 0);
  const top = Math.floor(viewport?.offsetTop || 0);

  openPanels.forEach(([, panel]) => {
    panel.style.position = "fixed";
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.margin = "0";
    panel.style.width = `${width}px`;
    panel.style.maxWidth = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.maxHeight = `${height}px`;
  });
}

function resetImportForm() {
  el.importForm.reset();
  el.importType.value = "pdf";
  el.importCategory.value = "";
  el.importCardContent.value = "";
  el.importPlainContent.value = "";
  el.importCardEditor.innerHTML = "";
  updateFilePickerName(el.importPdfFile, el.importPdfFileName);
  updateFilePickerName(el.importCardImage, el.importCardImageName, "(optional)");
  el.importType.disabled = false;
  el.importDialogTitle.textContent = "Add item";
  el.importSaveButton.innerHTML = "&#10003;";
  el.importSaveButton.setAttribute("aria-label", "Save");
  el.importSaveButton.title = "Save";
  el.importTitleLabel.textContent = "Title";
  el.importDeleteButton.classList.add("hidden");
  setImportStatus("");
}

function applyImportContext() {
  const context = state.importContext;
  const type = el.importType.value;
  const editing = Boolean(state.editingItemId);
  const linkOnly = context === "links" || type === "link";
  const cardOnly = context === "cards" || type === "card";

  el.importModal.dataset.context = context;
  el.importModal.dataset.itemType = type;
  el.importTypeRow.classList.toggle("hidden", context !== "library" || editing);
  el.importTitleLabel.textContent = "Title";
  el.importDialogTitle.textContent = editing
    ? `Edit ${type === "link" ? "link" : type === "card" ? "card" : "item"}`
    : context === "links"
      ? "Add link"
      : context === "cards"
        ? "Add card"
        : "Add item";
  el.importSaveButton.innerHTML = "&#10003;";
  el.importSaveButton.setAttribute("aria-label", editing ? "Save changes" : "Save");
  el.importSaveButton.title = editing ? "Save changes" : "Save";
  el.importDeleteButton.classList.toggle("hidden", !editing || !isDeletableItem(state.editingItemId));

  el.importCategoryRow.classList.toggle("hidden", linkOnly);
  el.importBookRow.classList.add("hidden");
  el.importComposerRow.classList.toggle("hidden", linkOnly || cardOnly);
  el.importPageRow.classList.add("hidden");
  el.importTagsRow.classList.toggle("hidden", linkOnly || cardOnly);
  el.importNotesRow.classList.toggle("hidden", false);

  if (linkOnly) {
    el.importCategory.value = "";
    el.importBook.value = "";
    el.importComposer.value = "";
    el.importPage.value = "";
    el.importTags.value = "";
  }

  if (context !== "library" && !editing) {
    el.importType.value = context === "links" ? "link" : "card";
  }
}

function updateImportTypeFields() {
  const type = el.importType.value;
  const editing = Boolean(state.editingItemId);
  applyImportContext();
  const fileBacked = type === "pdf" || type === "image";
  el.pdfImportFields.classList.toggle("hidden", !fileBacked || editing);
  el.importFileLabel.textContent = type === "image" ? "Photo or image" : "PDF, photo, or image";
  el.importPdfFile.accept = "application/pdf,.pdf,image/*";
  el.cardImportFields.classList.toggle("hidden", type !== "card" && type !== "note");
  el.importCardImageRow.classList.toggle("hidden", type !== "card");
  el.richCardContentRow.classList.toggle("hidden", type !== "card");
  el.plainCardContentRow.classList.toggle("hidden", type !== "note");
  el.linkImportFields.classList.toggle("hidden", type !== "link");
}

function startModalDrag(event) {
  if (window.matchMedia("(max-width: 760px)").matches) return;
  if (event.target.closest("button, input, select, textarea, a, [contenteditable]")) return;
  const rect = el.modalPanel.getBoundingClientRect();
  state.modalDrag = {
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
  el.modalPanel.classList.add("is-dragging");
  el.modalPanel.style.position = "fixed";
  el.modalPanel.style.left = `${rect.left}px`;
  el.modalPanel.style.top = `${rect.top}px`;
  el.modalPanel.style.margin = "0";
  el.modalPanel.style.width = `${rect.width}px`;
  el.modalPanel.style.maxWidth = "calc(100vw - 24px)";
  el.modalHeading.setPointerCapture?.(event.pointerId);
}

function moveModalDrag(event) {
  if (!state.modalDrag) return;
  const drag = state.modalDrag;
  const nextLeft = clamp(drag.left + event.clientX - drag.startX, 8, Math.max(8, window.innerWidth - drag.width - 8));
  const nextTop = clamp(drag.top + event.clientY - drag.startY, 8, Math.max(8, window.innerHeight - 80));
  el.modalPanel.style.left = `${nextLeft}px`;
  el.modalPanel.style.top = `${nextTop}px`;
}

function endModalDrag() {
  if (!state.modalDrag) return;
  state.modalDrag = null;
  el.modalPanel.classList.remove("is-dragging");
}

function prefillImportForm(item) {
  if (!item) return;
  el.importSaveButton.innerHTML = "&#10003;";
  el.importSaveButton.setAttribute("aria-label", "Save changes");
  el.importSaveButton.title = "Save changes";
  el.importType.value = item.type === "link" ? "link" : item.type;
  el.importType.disabled = true;
  el.importTitleField.value = normalizeVisibleText(item.title);
  el.importCategory.value = item.category || "";
  el.importBook.value = item.book || "";
  el.importComposer.value = item.composer || "";
  el.importPage.value = item.page || "";
  el.importTags.value = (item.tags || []).join(", ");
  el.importNotes.value = item.notes || "";
  if (item.type === "card") {
    const cardHtml = item.cardHtml || plainCardLinesToHtml(item.content || []);
    el.importCardEditor.innerHTML = sanitizeCardHtml(cardHtml);
    syncCardEditorToHiddenField();
  } else {
    el.importCardEditor.innerHTML = "";
    el.importCardContent.value = "";
  }
  el.importPlainContent.value = item.type === "note" ? (item.body || "") : "";
  el.importUrl.value = item.url || "";
}

function fillTitleFromPdfFile() {
  const file = el.importPdfFile.files?.[0];
  if (file && !state.editingItemId) {
    const detectedType = detectImportFileType(file, el.importType.value);
    if (detectedType !== el.importType.value) {
      el.importType.value = detectedType;
      updateImportTypeFields();
    }
  }
  if (file && !el.importTitleField.value.trim()) {
    el.importTitleField.value = file.name.replace(/\.[^.]+$/i, "");
  }
}

function updateFilePickerName(input, nameEl, emptyText = "No file selected") {
  if (!input || !nameEl) return;
  nameEl.textContent = input.files?.[0]?.name || emptyText;
}

function handleRichToolbarClick(event) {
  const button = event.target.closest("[data-rich-command]");
  if (!button) return;

  const command = button.dataset.richCommand;
  if (command === "photo") {
    saveCardEditorSelection();
    el.inlineCardImageInput.click();
    return;
  }

  el.importCardEditor.focus();
  document.execCommand(command, false, null);
  syncCardEditorToHiddenField();
  updateRichToolbarState();
}

function handleCardEditorClick(event) {
  const image = event.target.closest("img");
  if (!image || !el.importCardEditor.contains(image)) return;
  cycleCardImageSize(image);
  syncCardEditorToHiddenField();
}

function cycleCardImageSize(image) {
  const sizes = ["small", "medium", "large"];
  const current = image.dataset.cardImageSize || "medium";
  const next = sizes[(sizes.indexOf(current) + 1) % sizes.length] || "medium";
  image.dataset.cardImageSize = next;
  image.title = `Tap to resize (${next})`;
  setImportStatus(`Photo size: ${next}. Tap the photo again to change size.`);
}

async function handleInlineCardImageSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await imageFileToCardDataUrl(file);
    insertCardEditorHtml(`<img src="${escapeHtml(dataUrl)}" alt="" data-card-image-size="medium" title="Tap to resize"><div><br></div>`);
    syncCardEditorToHiddenField();
    updateRichToolbarState();
  } catch {
    setImportStatus("That photo could not be inserted into the card text.", true);
  } finally {
    event.target.value = "";
  }
}

function saveCardEditorSelection() {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!el.importCardEditor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== el.importCardEditor) return;
  state.cardEditorRange = range.cloneRange();
}

function insertCardEditorHtml(html) {
  el.importCardEditor.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  if (state.cardEditorRange) {
    selection.addRange(state.cardEditorRange);
  } else {
    const range = document.createRange();
    range.selectNodeContents(el.importCardEditor);
    range.collapse(false);
    selection.addRange(range);
  }
  document.execCommand("insertHTML", false, html);
  saveCardEditorSelection();
}

function imageFileToCardDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image."));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const maxEdge = 1000;
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        URL.revokeObjectURL(url);
        readFileAsDataUrl(file).then(resolve, reject);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      readFileAsDataUrl(file).then(resolve, reject);
    };
    image.src = url;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function syncCardEditorToHiddenField() {
  el.importCardContent.value = sanitizeCardHtml(el.importCardEditor.innerHTML);
}

function updateRichToolbarState() {
  if (!el.importCardEditor || !el.cardFormatToolbar) return;
  const selection = window.getSelection();
  const hasEditorSelection = selection?.rangeCount
    ? el.importCardEditor.contains(selection.anchorNode) || selection.anchorNode === el.importCardEditor
    : document.activeElement === el.importCardEditor;

  if (hasEditorSelection) saveCardEditorSelection();

  el.cardFormatToolbar.querySelectorAll("[data-rich-command]").forEach((button) => {
    const command = button.dataset.richCommand;
    if (!RICH_TOGGLE_COMMANDS.includes(command)) return;
    let active = false;
    if (hasEditorSelection) {
      try {
        active = document.queryCommandState(command);
      } catch {
        active = false;
      }
    }
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function plainCardLinesToHtml(lines = []) {
  return (lines || [])
    .map((line) => line ? `<div>${escapeHtml(line)}</div>` : "<div><br></div>")
    .join("");
}

function sanitizeCardHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "BR", "DIV", "P", "SPAN", "TABLE", "TBODY", "THEAD", "TR", "TD", "TH", "UL", "OL", "LI", "IMG"]);
  const allowedAttrs = new Set(["colspan", "rowspan"]);

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode("");

    const tagName = node.tagName.toUpperCase();
    if (!allowedTags.has(tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => fragment.appendChild(cleanNode(child)));
      return fragment;
    }

    const clean = document.createElement(tagName.toLowerCase());
    Array.from(node.attributes || []).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (tagName === "IMG" && name === "src" && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(attr.value)) {
        clean.setAttribute("src", attr.value);
        return;
      }
      if (tagName === "IMG" && name === "alt") {
        clean.setAttribute("alt", attr.value);
        return;
      }
      if (tagName === "IMG" && name === "data-card-image-size" && ["small", "medium", "large"].includes(attr.value)) {
        clean.setAttribute("data-card-image-size", attr.value);
        return;
      }
      if (tagName === "IMG" && name === "title") {
        clean.setAttribute("title", attr.value);
        return;
      }
      if (allowedAttrs.has(name)) clean.setAttribute(name, attr.value);
    });
    Array.from(node.childNodes).forEach((child) => clean.appendChild(cleanNode(child)));
    return clean;
  }

  const fragment = document.createDocumentFragment();
  Array.from(template.content.childNodes).forEach((child) => fragment.appendChild(cleanNode(child)));

  const holder = document.createElement("div");
  holder.appendChild(fragment);
  return holder.innerHTML.trim();
}

function htmlToPlainText(html = "") {
  const holder = document.createElement("div");
  holder.innerHTML = sanitizeCardHtml(html);
  return holder.innerText.trim();
}

async function handleImportSubmit(event) {
  event.preventDefault();
  setImportStatus("Saving...");

  try {
    let item;
    if (state.editingItemId) {
      item = state.itemsById.get(state.editingItemId);
      const editedFields = buildEditableFieldsFromForm(item.type, itemDisplayTitle(item));
      if (item.type === "card") {
        await addCardImageFromForm(state.editingItemId, editedFields);
      }
      saveItemEdit(state.editingItemId, editedFields);
      item = state.itemsById.get(state.editingItemId);
    } else {
      item = await buildImportedItemFromForm();
      await saveImportedItem(item);
    }
    const returnSection = state.importReturnSection;
    closeImportModal();
    renderAll();
    showSection(returnSection || (item.type === "card" ? "cards" : item.type === "link" ? "links" : "library"));
  } catch (error) {
    setImportStatus(error.message || "The song could not be saved.", true);
  }
}

async function buildImportedItemFromForm() {
  const selectedFile = el.importPdfFile.files?.[0];
  const type = detectImportFileType(selectedFile, el.importType.value);
  const fallbackTitle = getImportFallbackTitle(type);
  const item = {
    ...buildEditableFieldsFromForm(type, fallbackTitle),
    id: createImportedId(el.importTitleField.value.trim() || fallbackTitle),
    type,
    imported: true,
    importedAt: new Date().toISOString()
  };

  if (type === "pdf" || type === "image") {
    const file = selectedFile;
    if (!file) {
      throw new Error(type === "image" ? "Select or take a photo before saving." : "Select a PDF file before saving.");
    }
    item.fileName = file.name;
    item.fileMime = file.type;
    item.fileSize = file.size;
    if (findDuplicateImportedItem(item)) {
      throw new Error("That file already appears in the app.");
    }
    await storeLocalFile(item.id, file);
    item.fileId = item.id;
    return item;
  }

  if (type === "card") {
    if (findDuplicateImportedItem(item)) {
      throw new Error("That card already appears in the app.");
    }
    await addCardImageFromForm(item.id, item);
  }

  return item;
}

async function addCardImageFromForm(itemId, fields) {
  const file = el.importCardImage.files?.[0];
  if (!file) return;

  const imageFileId = `${itemId}-card-image`;
  await storeLocalFile(imageFileId, file);
  fields.imageFileId = imageFileId;
  fields.imageFileName = file.name;
  fields.imageMime = file.type;
  fields.imageSize = file.size;
}

function buildEditableFieldsFromForm(type, fallbackTitle = "Untitled Item") {
  const title = el.importTitleField.value.trim() || fallbackTitle;
  const fields = {
    title,
    category: el.importCategory.value.trim(),
    book: el.importBook.value.trim(),
    composer: el.importComposer.value.trim(),
    page: el.importPage.value ? Number(el.importPage.value) : undefined,
    tags: parseTags(el.importTags.value),
    notes: el.importNotes.value.trim()
  };

  if (!fields.category) delete fields.category;
  if (!fields.book) delete fields.book;
  if (!fields.composer) delete fields.composer;
  if (!fields.page) delete fields.page;
  if (!fields.notes) delete fields.notes;

  if (type === "card") {
    syncCardEditorToHiddenField();
    const cardHtml = sanitizeCardHtml(el.importCardEditor.innerHTML);
    const content = htmlToPlainText(cardHtml).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    fields.content = content ? content.split("\n") : [];
    if (cardHtml) {
      fields.cardHtml = cardHtml;
    } else {
      delete fields.cardHtml;
    }
  }

  if (type === "note") {
    const body = el.importPlainContent.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    fields.body = body || fields.notes || "";
  }

  if (type === "link") {
    const url = el.importUrl.value.trim();
    if (!url) {
      throw new Error("Paste a URL before saving.");
    }
    fields.url = normalizeUrl(url);
  }

  return fields;
}

function getImportFallbackTitle(type) {
  if (type === "pdf" || type === "image") {
    const file = el.importPdfFile.files?.[0];
    if (file?.name) return file.name.replace(/\.[^.]+$/i, "");
  }

  if (type === "link") {
    const url = el.importUrl.value.trim();
    if (url) {
      try {
        return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "") || "Untitled Link";
      } catch {
        return "Untitled Link";
      }
    }
    return "Untitled Link";
  }

  if (type === "card") return "Untitled Card";
  if (type === "image") return "Untitled Image";
  if (type === "note") return "Untitled Note";
  return "Untitled Item";
}

function detectImportFileType(file, selectedType) {
  if (!file) return selectedType;
  const name = file.name || "";
  if (file.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif|bmp|tiff?)$/i.test(name)) {
    return "image";
  }
  if (file.type === "application/pdf" || /\.pdf$/i.test(name)) {
    return "pdf";
  }
  return selectedType;
}

async function saveImportedItem(item) {
  const imported = getImportedItems();
  if (findDuplicateImportedItem(item, imported)) {
    throw new Error("That item already appears in the app.");
  }
  imported.push(item);
  writeJson(STORAGE_KEYS.importedItems, imported);
  state.data.items.push(item);
  state.itemsById.set(item.id, item);
}

function getImportedItems() {
  return readJson(STORAGE_KEYS.importedItems, [])
    .filter((item) => item && item.id && item.type);
}

function cleanupImportedItemDuplicates() {
  const imported = getImportedItems();
  const seen = new Map();
  const duplicateMap = new Map();
  const cleaned = [];

  imported.forEach((item) => {
    const key = importedItemDuplicateKey(item);
    if (!key) {
      cleaned.push(item);
      return;
    }

    const existing = seen.get(key);
    if (existing) {
      duplicateMap.set(item.id, existing.id);
      return;
    }

    seen.set(key, item);
    cleaned.push(item);
  });

  if (!duplicateMap.size) return imported;

  writeJson(STORAGE_KEYS.importedItems, cleaned);
  remapDuplicateItemReferences(duplicateMap);
  return cleaned;
}

function findDuplicateImportedItem(item, imported = getImportedItems()) {
  const key = importedItemDuplicateKey(item);
  if (!key) return null;
  return imported.find((candidate) => candidate.id !== item.id && importedItemDuplicateKey(candidate) === key) || null;
}

function importedItemDuplicateKey(item) {
  if (!item?.type) return "";
  const title = normalize(item.title);
  if (!title) return "";

  if (item.type === "pdf" || item.type === "image") {
    const fileName = normalize(item.fileName || item.imageFileName || item.file || "");
    const fileSize = item.fileSize || item.imageSize || "";
    if (!fileName || !fileSize) return "";
    return [item.type, title, fileName, fileSize, normalize(item.fileMime || item.imageMime || "")].join("|");
  }

  if (item.type === "link") {
    const url = normalize(item.url || "");
    return url ? [item.type, title, url].join("|") : "";
  }

  if (item.type === "card") {
    const cardText = normalize(item.cardHtml || (item.content || []).join("\n"));
    return cardText ? [item.type, title, cardText].join("|") : "";
  }

  if (item.type === "note") {
    const body = normalize(item.body || item.notes || "");
    return body ? [item.type, title, body].join("|") : "";
  }

  return "";
}

function remapDuplicateItemReferences(duplicateMap) {
  const duplicateIds = new Set(duplicateMap.keys());

  const favorites = readJson(STORAGE_KEYS.favorites, []);
  if (Array.isArray(favorites)) {
    const remappedFavorites = [];
    const seenFavorites = new Set();
    favorites.forEach((id) => {
      const nextId = duplicateMap.get(id) || id;
      if (seenFavorites.has(nextId)) return;
      seenFavorites.add(nextId);
      remappedFavorites.push(nextId);
    });
    writeJson(STORAGE_KEYS.favorites, remappedFavorites);
  }

  const remapEntries = (entries = []) => {
    const seen = new Set();
    return entries.map((entry) => {
      const nextId = duplicateMap.get(entry.itemId) || entry.itemId;
      return nextId === entry.itemId ? entry : { ...entry, itemId: nextId };
    }).filter((entry) => {
      if (!entry.itemId || seen.has(entry.itemId)) return false;
      seen.add(entry.itemId);
      return true;
    });
  };

  const lists = readJson(STORAGE_KEYS.lists, null);
  if (Array.isArray(lists)) {
    writeJson(STORAGE_KEYS.lists, lists.map((list) => ({
      ...list,
      entries: remapEntries(list.entries || list.items || [])
    })));
  }

  const setlists = readJson(STORAGE_KEYS.setlists, null);
  if (Array.isArray(setlists)) {
    writeJson(STORAGE_KEYS.setlists, setlists.map((list) => ({
      ...list,
      items: remapEntries(list.items || [])
    })));
  }

  const recents = readJson(STORAGE_KEYS.recents, []);
  if (Array.isArray(recents)) {
    const remappedRecents = [];
    const seenRecents = new Set();
    recents.forEach((id) => {
      const nextId = duplicateMap.get(id) || id;
      if (seenRecents.has(nextId)) return;
      seenRecents.add(nextId);
      remappedRecents.push(nextId);
    });
    writeJson(STORAGE_KEYS.recents, remappedRecents);
  }

  const pages = readJson(STORAGE_KEYS.pdfPages, {});
  let pagesChanged = false;
  duplicateMap.forEach((keptId, removedId) => {
    if (pages[removedId] && !pages[keptId]) pages[keptId] = pages[removedId];
    if (removedId in pages) {
      delete pages[removedId];
      pagesChanged = true;
    }
  });
  if (pagesChanged) writeJson(STORAGE_KEYS.pdfPages, pages);

  const edits = readJson(STORAGE_KEYS.itemEdits, {});
  let editsChanged = false;
  duplicateIds.forEach((id) => {
    if (id in edits) {
      delete edits[id];
      editsChanged = true;
    }
  });
  if (editsChanged) writeJson(STORAGE_KEYS.itemEdits, edits);
}

function isUserCreatedItem(itemId) {
  return getImportedItems().some((item) => item.id === itemId);
}

function isDeletableItem(itemId) {
  return Boolean(itemId && state.itemsById.has(itemId));
}

function deletedItemIds() {
  return new Set(readJson(STORAGE_KEYS.deletedItems, []));
}

function applyLocalItemEdits(items) {
  const edits = readJson(STORAGE_KEYS.itemEdits, {});
  return items.map((item) => {
    const itemEdits = edits[item.id];
    return itemEdits ? { ...item, ...sanitizeItemEdits(itemEdits), id: item.id, type: item.type } : item;
  });
}

function sanitizeItemEdits(itemEdits) {
  const clean = { ...itemEdits };
  if ("title" in clean && !normalizeVisibleText(clean.title)) delete clean.title;
  return clean;
}

function saveItemEdit(itemId, editedFields) {
  const allEdits = readJson(STORAGE_KEYS.itemEdits, {});
  allEdits[itemId] = {
    ...(allEdits[itemId] || {}),
    ...editedFields,
    editedAt: new Date().toISOString()
  };
  writeJson(STORAGE_KEYS.itemEdits, allEdits);

  const current = state.itemsById.get(itemId);
  if (current) {
    const updated = { ...current, ...editedFields, id: current.id, type: current.type };
    state.itemsById.set(itemId, updated);
    state.data.items = state.data.items.map((item) => item.id === itemId ? updated : item);
  }
}

async function handleDeleteItemFromForm() {
  if (!state.editingItemId) return;
  await confirmAndDeleteItem(state.editingItemId, { closeModal: true });
}

async function confirmAndDeleteItem(itemId, options = {}) {
  const item = state.itemsById.get(itemId);
  if (!item || !isDeletableItem(itemId)) {
    closeSwipeRows();
    return;
  }

  const ok = window.confirm("Delete this item? This cannot be undone.");
  if (!ok) {
    closeSwipeRows();
    return;
  }

  await deleteUserItem(itemId);
  const detailWasActive = el.sections.detail.classList.contains("active");
  closeSwipeRows();
  if (options.closeModal) closeImportModal();
  renderAll();

  if (state.currentPdf.item?.id === itemId) {
    closePdfViewer();
  }
  if (detailWasActive) {
    el.detailContent.innerHTML = "";
    showSection(state.previousSection || "library");
  } else if (state.activeSection === "cards" && item.type !== "card") {
    showSection("library");
  } else if (state.activeSection === "links" && item.type !== "link") {
    showSection("library");
  }
}

async function deleteUserItem(itemId) {
  const item = state.itemsById.get(itemId);
  if (!item) return;

  if (isUserCreatedItem(itemId)) {
    await Promise.all([
      removeLocalFile(item.fileId),
      removeLocalFile(item.imageFileId)
    ]);
  } else {
    const deletedIds = deletedItemIds();
    deletedIds.add(itemId);
    writeJson(STORAGE_KEYS.deletedItems, Array.from(deletedIds));
  }

  const imported = getImportedItems().filter((candidate) => candidate.id !== itemId);
  writeJson(STORAGE_KEYS.importedItems, imported);

  const edits = readJson(STORAGE_KEYS.itemEdits, {});
  delete edits[itemId];
  writeJson(STORAGE_KEYS.itemEdits, edits);

  state.data.items = state.data.items.filter((candidate) => candidate.id !== itemId);
  state.itemsById.delete(itemId);

  state.favorites.delete(itemId);
  writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));

  state.lists.forEach((list) => {
    list.entries = (list.entries || []).filter((entry) => entry.itemId !== itemId);
  });
  saveLists();

  const pdfPages = readJson(STORAGE_KEYS.pdfPages, {});
  delete pdfPages[itemId];
  writeJson(STORAGE_KEYS.pdfPages, pdfPages);

  const recents = readJson(STORAGE_KEYS.recents, []).filter((id) => id !== itemId);
  writeJson(STORAGE_KEYS.recents, recents);

  const lastOpened = readJson(STORAGE_KEYS.lastOpened, null);
  if (lastOpened?.id === itemId) {
    localStorage.removeItem(STORAGE_KEYS.lastOpened);
  }

  const quickChecks = readJson(STORAGE_KEYS.quickChecks, {});
  Object.keys(quickChecks).forEach((key) => {
    if (key.endsWith(`:${itemId}`)) delete quickChecks[key];
  });
  writeJson(STORAGE_KEYS.quickChecks, quickChecks);

  cleanupLegacyLists(itemId);
}

function cleanupLegacyLists(itemId) {
  const quickIndexes = readJson(STORAGE_KEYS.quickIndexes, []);
  if (Array.isArray(quickIndexes)) {
    writeJson(STORAGE_KEYS.quickIndexes, quickIndexes.map((list) => ({
      ...list,
      entries: (list.entries || []).filter((entry) => entry.itemId !== itemId)
    })));
  }

  const setlists = readJson(STORAGE_KEYS.setlists, []);
  if (Array.isArray(setlists)) {
    writeJson(STORAGE_KEYS.setlists, setlists.map((list) => ({
      ...list,
      items: (list.items || []).filter((entry) => entry.itemId !== itemId)
    })));
  }
}

function setImportStatus(message, isError = false) {
  el.importStatus.textContent = message;
  el.importStatus.classList.toggle("error", Boolean(isError));
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeUrl(value) {
  try {
    return new URL(value).href;
  } catch {
    try {
      return new URL(`https://${value}`).href;
    } catch {
      throw new Error("Enter a valid URL.");
    }
  }
}

function createImportedId(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "song";
  return `imported-${slug}-${Date.now().toString(36)}`;
}

function openImportDb() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("This browser does not support local file storage."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMPORT_DB_NAME, IMPORT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        db.createObjectStore(PDF_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local PDF storage could not be opened."));
  });
}

async function storePdfFile(fileId, file) {
  return storeLocalFile(fileId, file);
}

async function storeLocalFile(fileId, file) {
  // Imported PDFs, photos, and Card images stay private on this device in IndexedDB.
  // Data exports can include these blobs so a private setup can be moved to another device/version.
  const db = await openImportDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
    transaction.objectStore(PDF_STORE_NAME).put(file, fileId);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("The file could not be stored locally."));
    };
  });
}

async function getPdfFile(fileId) {
  return getLocalFile(fileId);
}

async function getLocalFile(fileId) {
  const db = await openImportDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PDF_STORE_NAME, "readonly");
    const request = transaction.objectStore(PDF_STORE_NAME).get(fileId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("The file could not be read from local storage."));
    };
  });
}

async function removeLocalFile(fileId) {
  if (!fileId) return;
  try {
    const db = await openImportDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
      transaction.objectStore(PDF_STORE_NAME).delete(fileId);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("The local file could not be deleted."));
      };
    });
  } catch {
    // Visible item data is still removed. Some browsers may block IndexedDB cleanup.
  }
}

function collectLocalFileIds(data = {}) {
  const ids = new Set();
  const addFromItem = (item) => {
    if (!item || typeof item !== "object") return;
    if (item.fileId) ids.add(item.fileId);
    if (item.imageFileId) ids.add(item.imageFileId);
  };

  (data.importedItems || []).forEach(addFromItem);
  Object.values(data.itemEdits || {}).forEach(addFromItem);
  state.data.items.forEach(addFromItem);

  return Array.from(ids);
}

async function collectBackupFiles(fileIds) {
  const files = [];
  const missingFileIds = [];

  for (const fileId of fileIds) {
    try {
      const file = await getLocalFile(fileId);
      if (!file) {
        missingFileIds.push(fileId);
        continue;
      }

      files.push({
        id: fileId,
        name: file.name || fileId,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        lastModified: file.lastModified || null,
        dataUrl: await fileToDataUrl(file)
      });
    } catch {
      missingFileIds.push(fileId);
    }
  }

  return { files, missingFileIds };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("The file could not be read for export."));
    reader.readAsDataURL(file);
  });
}

async function restoreBackupFiles(fileRecords) {
  if (!Array.isArray(fileRecords) || !fileRecords.length) return;

  for (const record of fileRecords) {
    if (!record?.id || !record.dataUrl) continue;
    const response = await fetch(record.dataUrl);
    const blob = await response.blob();
    let file = blob;

    try {
      file = new File([blob], record.name || record.id, {
        type: record.type || blob.type || "application/octet-stream",
        lastModified: record.lastModified || Date.now()
      });
    } catch {
      file.name = record.name || record.id;
      file.lastModified = record.lastModified || Date.now();
    }

    await storeLocalFile(record.id, file);
  }
}

function renderAll() {
  renderLibrary();
  renderLists();
  renderCards();
  renderLinks();
  renderFavorites();
  renderSearch();
}

function goHome() {
  if (!el.importModal.classList.contains("hidden")) {
    const ok = window.confirm("Close this form without saving?");
    if (!ok) return;
    closeImportModal();
  }

  state.listPickerOpen = false;
  state.listPickerMessage = "";
  state.listEditMode = false;
  closeSwipeRows();
  closeOverflowMenu();
  closeListMoreMenu();
  renderLists();
  showSection("favorites");
}

function showSection(sectionName) {
  if (!el.sections[sectionName]) return;

  if (sectionName !== "detail" && !el.pdfViewer.classList.contains("hidden")) {
    closePdfViewer();
  }

  Object.entries(el.sections).forEach(([name, section]) => {
    section.classList.toggle("active", name === sectionName);
  });

  setNavHighlight(sectionName);
  closeOverflowMenu({ restoreActive: false });
  closeListMoreMenu();

  if (sectionName !== "detail") {
    state.activeSection = sectionName;
    window.location.hash = sectionName;
  }

  updateNavPlacement(sectionName);
}

function renderLibrary() {
  const query = el.librarySearch.value;
  const fileItems = state.data.items.filter(isFileItem);
  const filtered = filterItems(fileItems, query);
  renderItemList(el.libraryContent, sortLibraryItems(filtered, el.librarySort.value), { compact: true, compactAction: "edit" });
}

function renderGroupedItems(container, items) {
  container.innerHTML = "";
  if (!items.length) {
    container.appendChild(emptyState());
    return;
  }

  const grouped = groupBy(items, (item) => item.category || "Uncategorized");
  Object.entries(grouped).forEach(([category, categoryItems]) => {
    const block = document.createElement("section");
    block.className = "category-block";
    block.innerHTML = `
      <div class="category-title">
        <h3>${escapeHtml(category)}</h3>
        <span>${categoryItems.length}</span>
      </div>
      <div class="stack"></div>
    `;
    const stack = block.querySelector(".stack");
    categoryItems
      .slice()
      .sort(compareTitle)
      .forEach((item) => stack.appendChild(createItemCard(item)));
    container.appendChild(block);
  });
}

function renderItemList(container, items, options = {}) {
  container.innerHTML = "";
  container.classList.toggle("compact-index-list", Boolean(options.compact));
  container.classList.toggle("favorite-list", Boolean(options.favoriteList));
  container.classList.toggle("favorite-reorder-list", Boolean(options.reorderFavorites));
  if (!items.length) {
    container.appendChild(emptyState());
    return;
  }
  items.forEach((item) => container.appendChild(createItemCard(item, options)));
}

function createItemCard(item, options = {}) {
  const article = document.createElement("article");
  const deleteAction = itemDeleteActionHtml(item);
  const title = itemDisplayTitle(item);
  article.className = `${options.compact ? "item-card compact-item-card" : "item-card"}${deleteAction ? " swipe-row" : ""}${options.reorderFavorites ? " favorite-reorder-row" : ""}`;
  article.dataset.id = item.id;
  if (options.reorderFavorites) article.dataset.favoriteRow = item.id;
  if (options.compact) {
    const reorderHandle = options.reorderFavorites
      ? `<button class="favorite-drag-handle" type="button" data-favorite-drag="${escapeHtml(item.id)}" aria-label="Drag to reorder ${escapeHtml(title)}" title="Drag to reorder"><span aria-hidden="true"></span></button>`
      : "";
    article.innerHTML = `
      ${deleteAction}
      <div class="swipe-content item-card-content compact-item-card-content">
        <button class="icon-button favorite-toggle ${state.favorites.has(item.id) ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(item.id)}" aria-label="Toggle favorite">
          ${state.favorites.has(item.id) ? "&#9733;" : "&#9734;"}
        </button>
        ${compactItemRowHtml(item, options)}
        ${reorderHandle}
      </div>
    `;
    setFavoriteIcons(article);
    return article;
  }
  article.innerHTML = `
    ${deleteAction}
    <div class="swipe-content item-card-content">
      <button class="icon-button favorite-toggle ${state.favorites.has(item.id) ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(item.id)}" aria-label="Toggle favorite">
        ${state.favorites.has(item.id) ? "★" : "☆"}
      </button>
      <button class="item-open" type="button" data-open="${escapeHtml(item.id)}">
        <h3>${escapeHtml(title)} <span class="type-pill">${escapeHtml(item.type)}</span></h3>
        ${metaHtml(item)}
        ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ""}
        ${tagsHtml(item.tags)}
      </button>
      <button class="icon-button info-button" type="button" data-detail="${escapeHtml(item.id)}" aria-label="Show info for ${escapeHtml(title)}">
        Info
      </button>
    </div>
  `;
  setFavoriteIcons(article);
  return article;
}

function itemDeleteActionHtml(item) {
  if (!isDeletableItem(item.id)) return "";
  return `<button class="swipe-delete-action" type="button" data-swipe-delete-item="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(itemDisplayTitle(item))}" title="Delete">&#128465;</button>`;
}

function compactItemRowHtml(item, options = {}) {
  const meta = compactLibraryMetaText(item);
  const title = itemDisplayTitle(item);
  const compactAction = options.compactAction === "edit"
    ? `
    <button class="icon-button info-button compact-info-button" type="button" data-edit-item="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(title)}" title="Edit">
      &#9998;
    </button>`
    : `
    <button class="icon-button info-button compact-info-button" type="button" data-detail="${escapeHtml(item.id)}" aria-label="Show info for ${escapeHtml(title)}" title="Info">
      i
    </button>`;
  return `
    <button class="item-open compact-item-open" type="button" data-open="${escapeHtml(item.id)}">
      <span class="compact-item-line">
        <span class="compact-title">${escapeHtml(title)}</span>
        ${meta ? `<span class="compact-meta">${escapeHtml(meta)}</span>` : ""}
      </span>
    </button>
    ${compactAction}
  `;
}

function renderLists() {
  cleanupListEntries();

  if (!state.lists.length) {
    state.activeListId = "";
    populateSelect(el.listSelect, []);
    el.listTabs.innerHTML = "";
    el.listEditButton.innerHTML = "&#9998;";
    el.listEditButton.setAttribute("aria-label", "Edit list");
    el.listEditButton.title = "Edit list";
    el.listEditButton.disabled = true;
    el.listMoreButton.disabled = false;
    el.listItemAddButton.disabled = true;
    el.listItemAddButton.classList.add("hidden");
    el.listEditButton.classList.remove("active-tool");
    el.listEditorPanel.classList.add("hidden");
    el.listEditorPanel.innerHTML = "";
    el.listPickerPanel.classList.add("hidden");
    el.listPickerPanel.innerHTML = "";
    el.listContent.innerHTML = `<div class="empty-state"><p>No lists yet.</p></div>`;
    state.expandedListId = "";
    return;
  }

  const active = getActiveList();
  if (!active) return;
  state.activeListId = active.id;
  if (state.expandedListId && !state.lists.some((list) => list.id === state.expandedListId)) {
    state.expandedListId = "";
  }
  el.listSelect.value = active.id;
  renderListTabs(active);

  el.listEditButton.innerHTML = state.listEditMode ? "&#10003;" : "&#9998;";
  el.listEditButton.setAttribute("aria-label", state.listEditMode ? "Save list changes" : "Edit list");
  el.listEditButton.title = state.listEditMode ? "Save list changes" : "Edit list";
  el.listEditButton.disabled = false;
  el.listMoreButton.disabled = false;
  el.listItemAddButton.disabled = true;
  el.listItemAddButton.classList.add("hidden");
  el.listEditButton.classList.toggle("active-tool", state.listEditMode);
  renderListEditorPanel(active);

  el.listContent.innerHTML = "";
  renderListPickerPanel(active);
}

function renderListTabs(active) {
  el.listTabs.innerHTML = state.lists.map((list) => {
    const itemCount = getResolvedListEntries(list).length;
    const activeClass = list.id === active.id ? " active" : "";
    const expandedClass = list.id === state.expandedListId ? " expanded" : "";
    const expanded = list.id === state.expandedListId ? "true" : "false";
    const selected = list.id === active.id ? "true" : "false";
    const title = list.title || "Untitled List";
    return `
      <div class="list-tab-group${activeClass}${expandedClass}" role="option" aria-selected="${selected}">
        <div class="list-tab-row">
        <button class="list-tab-main" type="button" data-select-list="${escapeHtml(list.id)}" title="${escapeHtml(title)}" aria-expanded="${expanded}">
          <span class="list-tab-title">${escapeHtml(title)}</span>
          ${itemCount ? `<span class="list-tab-count">${itemCount}</span>` : ""}
        </button>
        <button class="icon-button list-row-edit-button" type="button" data-edit-list-row="${escapeHtml(list.id)}" aria-label="Edit ${escapeHtml(title)}" title="Edit list">&#9998;</button>
        </div>
        ${list.id === state.expandedListId ? renderInlineListItems(list) : ""}
      </div>
    `;
  }).join("");
}

function renderInlineListItems(list) {
  const entries = getResolvedListEntries(list);

  if (!entries.length) {
    return `<div class="inline-list-items"><div class="inline-list-empty">No items yet.</div></div>`;
  }

  return `
    <div class="inline-list-items">
      ${entries.map((entry) => {
        const title = itemDisplayTitle(entry.item);
        const page = entry.page || entry.item.page;
        const favorite = state.favorites.has(entry.item.id);
        const meta = [
          page ? `p. ${page}` : "",
          entry.item.book || entry.item.category || "",
          entry.item.type || ""
        ].filter(Boolean).join(" - ");
        return `
          <div class="inline-list-row">
            <button class="icon-button favorite-toggle inline-list-favorite ${favorite ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(entry.item.id)}" aria-label="Toggle favorite for ${escapeHtml(title)}" title="Toggle favorite">
              ${favorite ? "&#9733;" : "&#9734;"}
            </button>
            <button class="inline-list-item" type="button" data-open="${escapeHtml(entry.item.id)}">
              <span class="compact-title">${escapeHtml(title)}</span>
              ${meta ? `<span class="compact-meta">${escapeHtml(meta)}</span>` : ""}
            </button>
            <button class="icon-button inline-list-edit-button" type="button" data-edit-item="${escapeHtml(entry.item.id)}" data-edit-context="lists" aria-label="Edit ${escapeHtml(title)}" title="Edit item">&#9998;</button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function getResolvedListEntries(list) {
  return (list.entries || []).map((entry, index) => {
    const item = state.itemsById.get(entry.itemId);
    return item ? { ...entry, item, manualIndex: index } : null;
  }).filter(Boolean);
}

function cleanupListEntries() {
  let changed = false;
  state.lists = state.lists.filter((list) => {
    let listChanged = false;
    const original = list.entries || [];
    const seen = new Set();
    const cleaned = [];

    original.forEach((entry) => {
      const itemId = entry?.itemId ? String(entry.itemId) : "";
      if (!itemId) {
        listChanged = true;
        return;
      }
      const itemExists = state.itemsById.has(itemId);
      if (!itemExists) {
        listChanged = true;
        return;
      }
      if (seen.has(itemId)) {
        listChanged = true;
        return;
      }
      seen.add(itemId);
      if (itemId === entry.itemId) {
        cleaned.push(entry);
      } else {
        listChanged = true;
        cleaned.push({ ...entry, itemId });
      }
    });

    if (listChanged) {
      list.entries = cleaned;
      changed = true;
    }

    if (original.length && !cleaned.length && !list.userCreated) {
      changed = true;
      return false;
    }

    return true;
  });

  if (changed) {
    if (state.activeListId && !state.lists.some((list) => list.id === state.activeListId)) {
      state.activeListId = state.lists[0]?.id || "";
    }
    saveLists();
  }
}

function createListRow(entry, list) {
  const showChecks = false;
  const title = itemDisplayTitle(entry.item);
  const page = entry.page || entry.item.page;
  const book = entry.book || entry.item.book;
  const note = entry.notes || entry.item.notes || "";
  const row = document.createElement("article");
  row.className = `list-row swipe-row ${showChecks ? "" : "no-check"} ${state.listEditMode ? "is-editing" : ""}`;
  row.dataset.id = entry.item.id;

  const checkboxHtml = showChecks
    ? `<input class="quick-check" type="checkbox" data-list-check="${escapeHtml(list.id)}:${entry.manualIndex}" ${entry.checked ? "checked" : ""} aria-label="Mark ${escapeHtml(title)}">`
    : "";
  const editActions = state.listEditMode
    ? `
      <div class="list-edit-actions" aria-label="Manual order">
        <button class="icon-button" type="button" data-move-list="${escapeHtml(list.id)}:${entry.manualIndex}:up" aria-label="Move up">&#8593;</button>
        <button class="icon-button" type="button" data-move-list="${escapeHtml(list.id)}:${entry.manualIndex}:down" aria-label="Move down">&#8595;</button>
        <button class="icon-button remove-button" type="button" data-remove-list="${escapeHtml(list.id)}:${entry.manualIndex}" aria-label="Remove from list">&times;</button>
      </div>
    `
    : "";
  const infoAction = state.listEditMode
    ? `
      <button class="icon-button info-button" type="button" data-detail="${escapeHtml(entry.item.id)}" aria-label="Show info for ${escapeHtml(title)}" title="Info">
        i
      </button>
    `
    : "";

  row.innerHTML = `
    <button class="swipe-delete-action" type="button" data-swipe-remove-list="${escapeHtml(list.id)}:${entry.manualIndex}" aria-label="Remove ${escapeHtml(title)} from this list" title="Remove from list">&#128465;</button>
    <div class="swipe-content list-row-content">
      ${checkboxHtml}
      <button class="quick-main" type="button" data-open="${escapeHtml(entry.item.id)}">
        <div class="quick-line">
          <span class="quick-title">${entry.order ? `<span class="quick-order">${escapeHtml(String(entry.order))}</span>` : ""}${escapeHtml(title)}</span>
          <span class="quick-page">${page ? `p. ${escapeHtml(String(page))}` : ""}</span>
        </div>
        <div class="quick-meta">
          ${book ? escapeHtml(book) : escapeHtml(entry.item.category || "")}
          ${note ? ` &middot; ${escapeHtml(note)}` : ""}
        </div>
      </button>
      ${infoAction}
      ${editActions}
    </div>
  `;
  return row;
}

function renderListEditorPanel(list) {
  el.listEditorPanel.classList.toggle("hidden", !state.listEditMode);
  if (!state.listEditMode) {
    el.listEditorPanel.innerHTML = "";
    return;
  }

  el.listEditorPanel.innerHTML = `
    <div class="editor-grid list-name-editor">
      <label>
        <span>List name</span>
        <input id="listTitleDraft" type="text" value="${escapeHtml(list.title)}" autocomplete="off">
      </label>
      <div class="quick-edit-actions">
        <button class="primary-button compact-action-button" type="button" data-save-list-title="${escapeHtml(list.id)}">Save</button>
        <button class="secondary-button compact-action-button" type="button" data-cancel-list-edit>Cancel</button>
      </div>
    </div>
  `;
}

function renderListPickerPanel(list) {
  el.listPickerPanel.classList.toggle("hidden", !state.listPickerOpen);
  if (!state.listPickerOpen) {
    el.listPickerPanel.innerHTML = "";
    state.listPickerMessage = "";
    return;
  }

  el.listPickerPanel.innerHTML = `
    <div class="picker-heading">
      <strong>Add item to list</strong>
      <button class="icon-button" type="button" data-close-list-picker aria-label="Close add item picker" title="Close">&times;</button>
    </div>
    <div class="editor-grid">
      <label>
        <span>Find item</span>
        <input id="listPickerSearch" type="search" autocomplete="off" placeholder="Title, book, composer, category">
      </label>
      <label>
        <span>Category / Genre</span>
        <input id="listPickerCategory" type="text" autocomplete="off" list="categorySuggestions" placeholder="Any">
      </label>
      <label>
        <span>Page override</span>
        <input id="listPickerPage" type="number" min="1" inputmode="numeric" placeholder="Optional">
      </label>
    </div>
    <p id="listPickerStatus" class="quick-meta">${escapeHtml(state.listPickerMessage || "")}</p>
    <div id="listPickerResults" class="picker-results"></div>
  `;
  updateListPickerOptions(list.id);
}

function updateListPickerOptions(listId = state.activeListId) {
  const results = document.getElementById("listPickerResults");
  if (!results) return;

  const query = document.getElementById("listPickerSearch")?.value || "";
  const category = normalize(document.getElementById("listPickerCategory")?.value || "");
  const items = state.data.items
    .filter(isFileItem)
    .filter((item) => matchesQuery(item, query))
    .filter((item) => !category || normalize(item.category).includes(category))
    .sort(compareTitle)
    .slice(0, 40);

  if (!items.length) {
    results.innerHTML = `<div class="empty-state"><p>No matching items.</p></div>`;
    return;
  }

  results.innerHTML = items.map((item) => {
    const title = itemDisplayTitle(item);
    return `
      <button class="picker-row" type="button" data-add-list="${escapeHtml(listId)}" data-picker-item="${escapeHtml(item.id)}">
        <span class="picker-title">${escapeHtml(title)}</span>
        <small>${escapeHtml(compactMetaText(item))}</small>
        <span class="picker-add">Add</span>
      </button>
    `;
  }).join("");
}

function renderCards() {
  const cards = state.data.items.filter((item) => item.type === "card").sort(compareTitle);
  el.cardsContent.classList.remove("cards-grid");
  renderItemList(el.cardsContent, cards, { compact: true });
}

function renderCardPreviews() {
  const cards = state.data.items.filter((item) => item.type === "card").sort(compareTitle);
  el.cardsContent.innerHTML = "";
  if (!cards.length) {
    el.cardsContent.appendChild(emptyState());
    return;
  }

  cards.forEach((card) => {
    const title = itemDisplayTitle(card);
    const article = document.createElement("article");
    const deleteAction = itemDeleteActionHtml(card);
    article.className = `song-card-preview${deleteAction ? " swipe-row" : ""}`;
    article.innerHTML = `
      ${deleteAction}
      <div class="swipe-content song-card-preview-content">
        <div class="card-actions">
          <button class="item-open" type="button" data-detail="${escapeHtml(card.id)}">
            <h3>${escapeHtml(title)}</h3>
            ${card.key ? `<p class="quick-meta">Key: ${escapeHtml(card.key)}</p>` : ""}
          </button>
          <button class="icon-button favorite-toggle ${state.favorites.has(card.id) ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(card.id)}" aria-label="Toggle favorite">
            ${state.favorites.has(card.id) ? "★" : "☆"}
          </button>
        </div>
        ${card.imageFileId ? localImageSlotHtml(card) : ""}
        ${cardContentHtml(card, { preview: true })}
      </div>
    `;
    setFavoriteIcons(article);
    hydrateLocalImages(article);
    el.cardsContent.appendChild(article);
  });
}

function renderLinks() {
  const links = state.data.items.filter((item) => item.type === "link").sort(compareTitle);
  renderItemList(el.linksContent, links, { compact: true });
}

function renderFavorites() {
  const favoriteRows = getFavoriteRows();
  const favoriteItemCount = favoriteRows.filter((row) => row.kind === "item").length;
  el.favoritesReorderButton.classList.toggle("hidden", !favoriteRows.length);
  el.favoriteDividerAddButton.classList.toggle("hidden", favoriteItemCount < 3);
  el.favoritesReorderButton.classList.toggle("active-tool", state.favoriteReorderMode);
  el.favoritesReorderButton.setAttribute("aria-pressed", state.favoriteReorderMode ? "true" : "false");
  if (!favoriteRows.length) {
    el.favoritesContent.classList.remove("compact-index-list");
    el.favoritesContent.classList.remove("favorite-list");
    el.favoritesContent.classList.remove("favorite-reorder-list");
    el.favoritesContent.innerHTML = `<div class="empty-state compact-empty"><p>No favorites yet.</p></div>`;
    return;
  }
  renderFavoriteRows(favoriteRows);
}

function getFavoriteRows() {
  const rows = Array.from(state.favorites).map((id) => {
    if (isFavoriteDividerId(id)) return { kind: "divider", id };
    const item = state.itemsById.get(id);
    return item ? { kind: "item", item } : null;
  }).filter(Boolean);
  return cleanupFavoriteRows(rows);
}

function cleanupFavoriteRows(rows) {
  const cleanedRows = [];
  let changed = false;
  let previousWasDivider = true;

  rows.forEach((row) => {
    if (row.kind === "divider") {
      if (previousWasDivider) {
        changed = true;
        return;
      }
      cleanedRows.push(row);
      previousWasDivider = true;
      return;
    }

    cleanedRows.push(row);
    previousWasDivider = false;
  });

  if (changed) {
    const cleanedIds = cleanedRows.map((row) => row.kind === "divider" ? row.id : row.item.id);
    state.favorites = new Set(cleanedIds);
    writeJson(STORAGE_KEYS.favorites, cleanedIds);
  }

  return cleanedRows;
}

function renderFavoriteRows(rows) {
  el.favoritesContent.innerHTML = "";
  el.favoritesContent.classList.add("compact-index-list", "favorite-list");
  el.favoritesContent.classList.toggle("favorite-reorder-list", state.favoriteReorderMode);
  rows.forEach((row) => {
    if (row.kind === "divider") {
      el.favoritesContent.appendChild(createFavoriteDividerRow(row.id, { reorderFavorites: state.favoriteReorderMode }));
      return;
    }
    el.favoritesContent.appendChild(createItemCard(row.item, { compact: true, favoriteList: true, reorderFavorites: state.favoriteReorderMode }));
  });
}

function createFavoriteDividerRow(id, options = {}) {
  const article = document.createElement("article");
  article.className = `favorite-divider-row${options.reorderFavorites ? " favorite-reorder-row" : ""}`;
  article.dataset.id = id;
  if (options.reorderFavorites) article.dataset.favoriteRow = id;

  const removeButton = options.reorderFavorites
    ? `<button class="icon-button favorite-divider-remove" type="button" data-remove-favorite-divider="${escapeHtml(id)}" aria-label="Remove divider" title="Remove divider">&times;</button>`
    : "";
  const reorderHandle = options.reorderFavorites
    ? `<button class="favorite-drag-handle" type="button" data-favorite-drag="${escapeHtml(id)}" aria-label="Drag divider to reorder" title="Drag to reorder"><span aria-hidden="true"></span></button>`
    : "";

  article.innerHTML = `
    <div class="favorite-divider-content${options.reorderFavorites ? " favorite-divider-editing" : ""}">
      <span class="favorite-divider-line" aria-hidden="true"></span>
      ${reorderHandle}
      ${removeButton}
    </div>
  `;
  return article;
}

function toggleFavoriteReorderMode() {
  state.favoriteReorderMode = !state.favoriteReorderMode;
  closeSwipeRows();
  renderFavorites();
}

function renderSearch() {
  const query = el.globalSearch.value.trim();
  el.searchContent.innerHTML = "";

  if (!query) {
    const recentItems = getRecentItems();
    if (recentItems.length) {
      recentItems.forEach((item) => el.searchContent.appendChild(createItemCard(item)));
    } else {
      el.searchContent.innerHTML = `<div class="empty-state"><p>Type a search term to find songs, cards, notes, pages, and tags.</p></div>`;
    }
    return;
  }

  renderItemList(el.searchContent, filterItems(state.data.items, query).sort(compareTitle));
}

async function handleBodyClick(event) {
  if (state.swipe.suppressClick) {
    state.swipe.suppressClick = false;
    event.preventDefault();
    return;
  }

  if (!event.target.closest(".overflow-wrap")) {
    closeOverflowMenu();
    closeListMoreMenu();
  }

  const menuSectionButton = event.target.closest("[data-menu-section]");
  if (menuSectionButton) {
    showSection(menuSectionButton.dataset.menuSection);
    return;
  }

  const settingsButton = event.target.closest("[data-open-settings]");
  if (settingsButton) {
    openSettingsModal();
    return;
  }

  const refreshAppButton = event.target.closest("[data-refresh-app]");
  if (refreshAppButton) {
    await refreshAppShell();
    return;
  }

  const helpButton = event.target.closest("[data-open-help]");
  if (helpButton) {
    openHelpModal();
    return;
  }

  const aboutButton = event.target.closest("[data-open-about]");
  if (aboutButton) {
    openAboutModal();
    return;
  }

  const menuMessageButton = event.target.closest("[data-menu-message]");
  if (menuMessageButton) {
    window.alert(menuMessageButton.dataset.menuMessage);
    closeOverflowMenu();
    return;
  }

  const swipeDeleteButton = event.target.closest("[data-swipe-delete-item]");
  if (swipeDeleteButton) {
    await confirmAndDeleteItem(swipeDeleteButton.dataset.swipeDeleteItem);
    return;
  }

  const swipeRemoveListButton = event.target.closest("[data-swipe-remove-list]");
  if (swipeRemoveListButton) {
    confirmAndRemoveListItem(swipeRemoveListButton.dataset.swipeRemoveList);
    return;
  }

  const removeFavoriteDividerButton = event.target.closest("[data-remove-favorite-divider]");
  if (removeFavoriteDividerButton) {
    removeFavoriteDivider(removeFavoriteDividerButton.dataset.removeFavoriteDivider);
    return;
  }

  if (!event.target.closest(".swipe-row.swipe-open")) {
    closeSwipeRows();
  }

  const editButton = event.target.closest("[data-edit-item]");
  if (editButton) {
    const editContext = editButton.dataset.editContext || (editButton.closest("#listsSection") ? "lists" : "library");
    if (editButton.closest("#listEditModal")) {
      saveCurrentModalListTitle();
      closeListEditModal();
    }
    openImportModal(editButton.dataset.editItem, "pdf", editContext);
    return;
  }

  const deleteItemButton = event.target.closest("[data-delete-item]");
  if (deleteItemButton) {
    await confirmAndDeleteItem(deleteItemButton.dataset.deleteItem);
    return;
  }

  const addListButton = event.target.closest("[data-add-list]");
  if (addListButton) {
    addItemToList(
      addListButton.dataset.addList,
      addListButton.dataset.pickerItem,
      document.getElementById("listPickerPage")?.value
    );
    return;
  }

  const moveListModalButton = event.target.closest("[data-list-modal-move]");
  if (moveListModalButton) {
    moveListItemFromModal(moveListModalButton.dataset.listModalMove);
    return;
  }

  const selectListButton = event.target.closest("[data-select-list]");
  if (selectListButton) {
    selectList(selectListButton.dataset.selectList);
    return;
  }

  const editListRowButton = event.target.closest("[data-edit-list-row]");
  if (editListRowButton) {
    editListFromRow(editListRowButton.dataset.editListRow);
    return;
  }

  const closeListPickerButton = event.target.closest("[data-close-list-picker]");
  if (closeListPickerButton) {
    state.listPickerOpen = false;
    state.listPickerMessage = "";
    renderLists();
    return;
  }

  const newListButton = event.target.closest("[data-new-list]");
  if (newListButton) {
    createList();
    closeListMoreMenu();
    return;
  }

  const deleteActiveListButton = event.target.closest("[data-delete-active-list]");
  if (deleteActiveListButton) {
    const active = getActiveList();
    if (active) deleteList(active.id);
    closeListMoreMenu();
    return;
  }

  const deleteListButton = event.target.closest("[data-delete-list]");
  if (deleteListButton) {
    deleteList(deleteListButton.dataset.deleteList);
    closeListMoreMenu();
    return;
  }

  const saveListTitleButton = event.target.closest("[data-save-list-title]");
  if (saveListTitleButton) {
    saveListTitleFromEditor(saveListTitleButton.dataset.saveListTitle);
    return;
  }

  const cancelListEditButton = event.target.closest("[data-cancel-list-edit]");
  if (cancelListEditButton) {
    state.listEditMode = false;
    renderLists();
    return;
  }

  const removeListButton = event.target.closest("[data-remove-list]");
  if (removeListButton) {
    removeListItem(removeListButton.dataset.removeList);
    return;
  }

  const moveListButton = event.target.closest("[data-move-list]");
  if (moveListButton) {
    moveListItem(moveListButton.dataset.moveList);
    return;
  }

  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.favorite);
    return;
  }

  const openButton = event.target.closest("[data-open]");
  if (openButton) {
    openItem(openButton.dataset.open);
    return;
  }

  const detailButton = event.target.closest("[data-detail]");
  if (detailButton) {
    openDetail(detailButton.dataset.detail);
    return;
  }

}

function handleFavoriteDragPointerDown(event) {
  const handle = event.target.closest("[data-favorite-drag]");
  if (!handle) return;

  const row = handle.closest("[data-favorite-row]");
  const container = row?.parentElement;
  if (!row || !container) return;

  event.preventDefault();
  closeSwipeRows();
  state.favoriteDrag = {
    row,
    container,
    pointerId: event.pointerId,
    startY: event.clientY,
    moved: false
  };
  row.classList.add("is-dragging");
  container.classList.add("favorites-reorder-active");
  handle.setPointerCapture?.(event.pointerId);
}

function handleFavoriteDragPointerMove(event) {
  const drag = state.favoriteDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;

  const deltaY = event.clientY - drag.startY;
  if (Math.abs(deltaY) > 4) drag.moved = true;
  event.preventDefault();

  const rows = Array.from(drag.container.querySelectorAll("[data-favorite-row]"))
    .filter((row) => row !== drag.row);
  const beforeRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2;
  });

  if (beforeRow) {
    drag.container.insertBefore(drag.row, beforeRow);
  } else {
    drag.container.appendChild(drag.row);
  }
}

function handleFavoriteDragPointerUp(event) {
  const drag = state.favoriteDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  finishFavoriteDrag(true);
}

function handleFavoriteDragPointerCancel(event) {
  const drag = state.favoriteDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  finishFavoriteDrag(false);
}

function finishFavoriteDrag(saveOrder) {
  const drag = state.favoriteDrag;
  if (!drag.row || !drag.container) return;

  const orderedIds = Array.from(drag.container.querySelectorAll("[data-favorite-row]"))
    .map((row) => row.dataset.favoriteRow)
    .filter(Boolean);

  drag.row.classList.remove("is-dragging");
  drag.container.classList.remove("favorites-reorder-active");

  const shouldSave = saveOrder && drag.moved;
  state.favoriteDrag = {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false
  };

  if (shouldSave) {
    saveFavoriteOrder(orderedIds);
    state.swipe.suppressClick = true;
    window.setTimeout(() => {
      state.swipe.suppressClick = false;
    }, 250);
  } else if (!saveOrder) {
    renderFavorites();
  }
}

function handleSwipePointerDown(event) {
  if (event.pointerType && event.pointerType !== "touch" && event.pointerType !== "pen") return;
  if (event.target.closest(".swipe-delete-action, .favorite-drag-handle, input, textarea, select")) return;

  const row = event.target.closest(".swipe-row");
  if (!row) return;

  state.swipe.row = row;
  state.swipe.startX = event.clientX;
  state.swipe.startY = event.clientY;
  state.swipe.wasSwipe = false;
}

function handleSwipePointerMove(event) {
  const row = state.swipe.row;
  if (!row) return;

  const dx = event.clientX - state.swipe.startX;
  const dy = event.clientY - state.swipe.startY;
  const horizontal = Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2;
  if (!horizontal) return;

  state.swipe.wasSwipe = true;
  event.preventDefault();

  if (dx < -42) {
    closeSwipeRows(row);
    row.classList.add("swipe-open");
  } else if (dx > 28) {
    row.classList.remove("swipe-open");
  }
}

function handleSwipePointerUp() {
  if (state.swipe.wasSwipe) {
    state.swipe.suppressClick = true;
    window.setTimeout(() => {
      state.swipe.suppressClick = false;
    }, 350);
  }

  state.swipe.row = null;
  state.swipe.startX = 0;
  state.swipe.startY = 0;
  state.swipe.wasSwipe = false;
}

function closeSwipeRows(exceptRow = null) {
  document.querySelectorAll(".swipe-row.swipe-open").forEach((row) => {
    if (row !== exceptRow) row.classList.remove("swipe-open");
  });
}

function handleBodyChange(event) {
  const listModalCheckbox = event.target.closest("[data-list-modal-check]");
  if (listModalCheckbox) {
    toggleListItemFromModal(listModalCheckbox.dataset.listModalCheck, listModalCheckbox.checked);
    return;
  }

  const listTitleInput = event.target.closest("[data-list-title]");
  if (listTitleInput) {
    updateListTitle(listTitleInput.dataset.listTitle, listTitleInput.value);
    return;
  }

  const listCheck = event.target.closest("[data-list-check]");
  if (listCheck) {
    const [listId, indexText] = listCheck.dataset.listCheck.split(":");
    const list = state.lists.find((candidate) => candidate.id === listId);
    const index = Number(indexText);
    if (list?.entries?.[index]) {
      list.entries[index].checked = listCheck.checked;
      saveLists();
    }
  }
}

function handleBodyInput(event) {
  if (event.target.closest("#listPickerSearch") || event.target.closest("#listPickerCategory")) {
    updateListPickerOptions();
    return;
  }

  if (event.target.closest("#listEditSearch")) {
    renderListEditResults();
    return;
  }

  const listTitleInput = event.target.closest("[data-list-title]");
  if (listTitleInput) {
    updateListTitle(listTitleInput.dataset.listTitle, listTitleInput.value);
  }
}

function openItem(id) {
  const item = state.itemsById.get(id);
  if (!item) return;
  rememberOpened(item);

  if (item.type === "image") {
    return `
      <article class="detail-card compact-detail-card image-detail-card">
        ${localImageSlotHtml(item)}
        ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
        ${compactHeader}
      </article>
    `;
  }

  if (item.type === "pdf") {
    openPdf(item);
  } else if (item.type === "link") {
    openLinkItem(item);
  } else {
    openDetail(id);
  }
}

function openDetail(id) {
  const item = state.itemsById.get(id);
  if (!item) return;
  rememberOpened(item);

  state.previousSection = state.activeSection;
  el.detailContent.innerHTML = detailHtml(item);
  setFavoriteIcons(el.detailContent);
  hydrateLocalImages(el.detailContent);
  showSection("detail");
}

function detailHtml(item) {
  const title = itemDisplayTitle(item);
  const favorite = state.favorites.has(item.id);
  const editAction = `<button class="secondary-button" type="button" data-edit-item="${escapeHtml(item.id)}">Edit</button>`;
  const deleteAction = isDeletableItem(item.id)
    ? `<button class="icon-button danger-icon" type="button" data-delete-item="${escapeHtml(item.id)}" aria-label="Delete" title="Delete">&#128465;</button>`
    : "";
  const favoriteAction = `
    <button class="icon-button favorite-toggle ${favorite ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(item.id)}" aria-label="Toggle favorite">
      ${favorite ? "&#9733;" : "&#9734;"}
    </button>
  `;
  const compactHeader = `
    <div class="compact-detail-header">
      <span id="detailTitle" class="compact-detail-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
      <span class="type-pill compact-type">${escapeHtml(item.type)}</span>
      ${favoriteAction}
      ${deleteAction}
      ${editAction}
    </div>
    <div class="compact-detail-meta">
      ${metaHtml(item)}
      ${tagsHtml(item.tags)}
    </div>
  `;

  if (item.type === "card") {
    const visibleTitle = title && title !== "Untitled Song Card" && title !== "Untitled Card";
    const cardTitle = visibleTitle
      ? `<span id="detailTitle" class="compact-detail-title">${escapeHtml(title)}</span>`
      : `<span id="detailTitle" class="sr-only">Card</span>`;
    return `
      <article class="detail-card card-detail-card">
        ${item.imageFileId ? localImageSlotHtml(item) : ""}
        ${cardContentHtml(item)}
        ${cardFactsHtml(item)}
        ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ""}
        <div class="detail-actions card-detail-actions">
          ${cardTitle}
          ${favoriteAction}
          ${deleteAction}
          ${editAction}
        </div>
      </article>
    `;
  }

  if (item.type === "note") {
    return `
      <article class="detail-card compact-detail-card">
        ${compactHeader}
        <div class="note-body">${escapeHtml(item.body || item.notes || "")}</div>
      </article>
    `;
  }

  if (item.type === "link") {
    return `
      <article class="detail-card compact-detail-card">
        <div class="detail-actions detail-primary-actions">
          <a class="primary-button" href="${escapeHtml(item.url || "#")}" target="_blank" rel="noopener">Open Link</a>
        </div>
        ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
        <p class="quick-meta compact-url">${escapeHtml(item.url || "")}</p>
        ${compactHeader}
      </article>
    `;
  }

  if (item.type === "pdf") {
    return `
      <article class="detail-card compact-detail-card">
        <div class="detail-actions detail-primary-actions">
          <button class="primary-button" type="button" data-open="${escapeHtml(item.id)}">Open PDF</button>
        </div>
        ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
        ${compactHeader}
      </article>
    `;
  }

  return `
    <article class="detail-card compact-detail-card">
      ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
      ${compactHeader}
    </article>
  `;
}

function cardFactsHtml(item) {
  const facts = [
    item.key ? `Key: ${item.key}` : "",
    item.capo ? `Capo: ${item.capo}` : "",
    item.startingNote ? `Starting note: ${item.startingNote}` : ""
  ].filter(Boolean);
  return facts.length ? `<p class="quick-meta">${escapeHtml(facts.join(" · "))}</p>` : "";
}

function cardContentHtml(item, options = {}) {
  if (item.cardHtml) {
    return `<div class="rich-card-content${options.preview ? " rich-card-preview" : ""}">${sanitizeCardHtml(item.cardHtml)}</div>`;
  }
  const lines = options.preview ? (item.content || []).slice(0, 10) : (item.content || []);
  return lines.length ? `<pre class="chord-sheet">${escapeHtml(lines.join("\n"))}</pre>` : "";
}

function localImageSlotHtml(item) {
  const fileId = item.imageFileId || item.fileId;
  return `
    <div class="song-card-image" data-image-file-id="${escapeHtml(fileId)}" data-image-alt="${escapeHtml(itemDisplayTitle(item))} image">
      <p class="quick-meta">Loading image...</p>
    </div>
  `;
}

async function openPdf(item) {
  releasePdfObjectUrl();
  state.currentPdf.item = item;
  state.currentPdf.doc = null;
  state.currentPdf.objectUrl = null;
  state.currentPdf.pageNumber = 1;
  state.currentPdf.pageCount = 0;
  resetPdfZoom();
  el.pdfTitle.textContent = itemDisplayTitle(item);
  el.pdfPageStatus.textContent = "Loading";
  el.pdfCanvas.classList.add("hidden");
  showPdfMessage("Loading PDF...");
  document.body.classList.add("pdf-open");
  el.pdfViewer.classList.remove("hidden");

  if (!window.pdfjsLib) {
    showPdfMessage("PDF.js could not be loaded. Check your internet connection or download PDF.js for local use.");
    return;
  }

  try {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const pdfSource = await getPdfSource(item);
    const loadingTask = window.pdfjsLib.getDocument(pdfSource);
    state.currentPdf.doc = await loadingTask.promise;
    state.currentPdf.pageCount = state.currentPdf.doc.numPages;
    state.currentPdf.pageNumber = clamp(state.currentPdf.pageNumber, 1, state.currentPdf.pageCount);
    resetPdfZoom();
    await renderPdfPage(state.currentPdf.pageNumber);
    savePdfPage();
    rememberOpened(item, state.currentPdf.pageNumber);
  } catch (error) {
    const message = item.fileId
      ? "This imported PDF was not found in local browser storage. Try importing it again from this device."
      : "This PDF file was not found. Check the filename or folder path in library.json.";
    showPdfMessage(message);
    el.pdfPageStatus.textContent = "PDF unavailable";
  }
}

function openLinkItem(item) {
  if (!item.url) {
    openDetail(item.id);
    return;
  }
  if (!navigator.onLine) {
    window.alert("This link requires internet access.");
    return;
  }
  const opened = window.open(item.url, "_blank", "noopener");
  if (!opened) {
    window.location.href = item.url;
  }
}

async function getPdfSource(item) {
  if (item.fileId) {
    const file = await getPdfFile(item.fileId);
    if (!file) {
      throw new Error("Imported PDF missing");
    }
    state.currentPdf.objectUrl = URL.createObjectURL(file);
    return state.currentPdf.objectUrl;
  }

  if (!item.file) {
    throw new Error("PDF path missing");
  }
  return item.file;
}

function releasePdfObjectUrl() {
  if (state.currentPdf.objectUrl) {
    URL.revokeObjectURL(state.currentPdf.objectUrl);
    state.currentPdf.objectUrl = null;
  }
}

async function renderPdfPage(pageNumber) {
  if (!state.currentPdf.doc) return;

  if (state.currentPdf.rendering) {
    state.currentPdf.pendingPage = pageNumber;
    return;
  }

  state.currentPdf.rendering = true;
  showPdfMessage("Rendering page...");

  try {
    const page = await state.currentPdf.doc.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1 });
    const stageBox = el.pdfStage.getBoundingClientRect();
    const maxWidth = Math.max(stageBox.width - 24, 320);
    const maxHeight = Math.max(stageBox.height - 24, 320);
    const fitScale = Math.min(maxWidth / unscaled.width, maxHeight / unscaled.height);
    const viewport = page.getViewport({ scale: fitScale });
    const outputScale = window.devicePixelRatio || 1;
    const canvas = el.pdfCanvas;
    const context = canvas.getContext("2d");

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    applyPdfTransform();

    await page.render({ canvasContext: context, viewport }).promise;
    state.currentPdf.pageNumber = pageNumber;
    savePdfPage();
    rememberOpened(state.currentPdf.item, pageNumber);
    updatePdfStatus();
    el.pdfCanvas.classList.remove("hidden");
    el.pdfLoading.classList.add("hidden");
  } catch (error) {
    showPdfMessage("This PDF page could not be displayed.");
  } finally {
    state.currentPdf.rendering = false;
    if (state.currentPdf.pendingPage) {
      const pending = state.currentPdf.pendingPage;
      state.currentPdf.pendingPage = null;
      renderPdfPage(pending);
    }
  }
}

function showPdfMessage(message) {
  el.pdfLoading.textContent = message;
  el.pdfLoading.classList.remove("hidden");
}

function updatePdfStatus() {
  el.pdfPageStatus.textContent = `Page ${state.currentPdf.pageNumber} of ${state.currentPdf.pageCount}`;
}

function previousPdfPage() {
  if (!state.currentPdf.doc || state.currentPdf.pageNumber <= 1) return;
  goToPdfPage(state.currentPdf.pageNumber - 1);
}

function nextPdfPage() {
  if (!state.currentPdf.doc || state.currentPdf.pageNumber >= state.currentPdf.pageCount) return;
  goToPdfPage(state.currentPdf.pageNumber + 1);
}

function firstPdfPage() {
  goToPdfPage(1);
}

function lastPdfPage() {
  goToPdfPage(state.currentPdf.pageCount);
}

function goToPdfPage(pageNumber) {
  if (!state.currentPdf.doc || !state.currentPdf.pageCount) return;
  const targetPage = clamp(pageNumber, 1, state.currentPdf.pageCount);
  if (targetPage === state.currentPdf.pageNumber && !state.currentPdf.rendering) return;
  resetPdfZoom();
  renderPdfPage(targetPage);
}

function closePdfViewer() {
  el.pdfViewer.classList.add("hidden");
  document.body.classList.remove("pdf-open");
  resetPdfZoom();
  releasePdfObjectUrl();
  state.currentPdf.doc = null;
  state.currentPdf.item = null;
}

function handlePdfTapZoneClick(event, direction) {
  if (state.currentPdf.suppressClick) {
    event.preventDefault();
    state.currentPdf.suppressClick = false;
    return;
  }

  const stageBox = el.pdfStage.getBoundingClientRect();
  const tappedTopQuarter = event.clientY <= stageBox.top + stageBox.height / 4;
  if (tappedTopQuarter) {
    event.preventDefault();
    if (direction === "previous") {
      firstPdfPage();
    } else {
      lastPdfPage();
    }
    return;
  }

  if (direction === "previous") {
    previousPdfPage();
  } else {
    nextPdfPage();
  }
}

function handlePdfTouchStart(event) {
  if (event.touches.length === 2) {
    event.preventDefault();
    const center = getTouchCenter(event.touches);
    state.currentPdf.touchMode = "pinch";
    state.currentPdf.touchMoved = true;
    state.currentPdf.touchStartDistance = getTouchDistance(event.touches);
    state.currentPdf.touchStartCenterX = center.x;
    state.currentPdf.touchStartCenterY = center.y;
    state.currentPdf.touchStartZoom = state.currentPdf.zoom;
    state.currentPdf.touchStartPanX = state.currentPdf.panX;
    state.currentPdf.touchStartPanY = state.currentPdf.panY;
    return;
  }

  const touch = event.touches[0];
  state.currentPdf.touchMode = state.currentPdf.zoom > 1.02 ? "pan" : "tap";
  state.currentPdf.touchMoved = false;
  state.currentPdf.touchStartX = touch.clientX;
  state.currentPdf.touchStartY = touch.clientY;
  state.currentPdf.touchStartPanX = state.currentPdf.panX;
  state.currentPdf.touchStartPanY = state.currentPdf.panY;
}

function handlePdfTouchMove(event) {
  if (state.currentPdf.touchMode === "pinch" && event.touches.length >= 2) {
    event.preventDefault();
    const distance = getTouchDistance(event.touches);
    const center = getTouchCenter(event.touches);
    const ratio = distance / Math.max(state.currentPdf.touchStartDistance, 1);
    state.currentPdf.zoom = clamp(state.currentPdf.touchStartZoom * ratio, 1, 4);
    state.currentPdf.panX = state.currentPdf.touchStartPanX + (center.x - state.currentPdf.touchStartCenterX);
    state.currentPdf.panY = state.currentPdf.touchStartPanY + (center.y - state.currentPdf.touchStartCenterY);
    state.currentPdf.touchMoved = true;
    applyPdfTransform();
    return;
  }

  if (state.currentPdf.touchMode === "pan" && event.touches.length === 1) {
    event.preventDefault();
    const touch = event.touches[0];
    const dx = touch.clientX - state.currentPdf.touchStartX;
    const dy = touch.clientY - state.currentPdf.touchStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.currentPdf.touchMoved = true;
    state.currentPdf.panX = state.currentPdf.touchStartPanX + dx;
    state.currentPdf.panY = state.currentPdf.touchStartPanY + dy;
    applyPdfTransform();
  }
}

function handlePdfTouchEnd(event) {
  if (state.currentPdf.touchMode === "pinch") {
    event.preventDefault();
    if (event.touches.length >= 2) return;
    suppressNextPdfClick();
    finishPdfGesture();
    return;
  }

  const touch = event.changedTouches[0];
  const dx = touch.clientX - state.currentPdf.touchStartX;
  const dy = touch.clientY - state.currentPdf.touchStartY;
  const moved = state.currentPdf.touchMoved || Math.abs(dx) > 10 || Math.abs(dy) > 10;

  if (state.currentPdf.touchMode === "pan") {
    if (moved) {
      event.preventDefault();
      suppressNextPdfClick();
    }
    finishPdfGesture();
    return;
  }

  if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) {
    event.preventDefault();
    suppressNextPdfClick();
    if (dx < 0) {
      nextPdfPage();
    } else {
      previousPdfPage();
    }
    return;
  }

  finishPdfGesture();
}

function finishPdfGesture() {
  if (state.currentPdf.zoom <= 1.02) {
    resetPdfZoom();
  } else {
    clampPdfPan();
    applyPdfTransform();
  }
  state.currentPdf.touchMode = "";
  state.currentPdf.touchMoved = false;
}

function suppressNextPdfClick() {
  state.currentPdf.suppressClick = true;
  window.setTimeout(() => {
    state.currentPdf.suppressClick = false;
  }, 250);
}

function getTouchDistance(touches) {
  const first = touches[0];
  const second = touches[1];
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function getTouchCenter(touches) {
  const first = touches[0];
  const second = touches[1];
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2
  };
}

function resetPdfZoom() {
  if (!state.currentPdf) return;
  state.currentPdf.zoom = 1;
  state.currentPdf.panX = 0;
  state.currentPdf.panY = 0;
  state.currentPdf.touchMode = "";
  state.currentPdf.touchMoved = false;
  applyPdfTransform();
}

function applyPdfTransform() {
  if (!el.pdfCanvas) return;
  clampPdfPan();
  const { panX, panY, zoom } = state.currentPdf;
  el.pdfCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  el.pdfCanvas.classList.toggle("is-zoomed", zoom > 1.02);
}

function clampPdfPan() {
  if (!el.pdfCanvas || state.currentPdf.zoom <= 1.02) {
    state.currentPdf.panX = 0;
    state.currentPdf.panY = 0;
    return;
  }

  const stageBox = el.pdfStage.getBoundingClientRect();
  const canvasWidth = el.pdfCanvas.offsetWidth || stageBox.width;
  const canvasHeight = el.pdfCanvas.offsetHeight || stageBox.height;
  const scaledWidth = canvasWidth * state.currentPdf.zoom;
  const scaledHeight = canvasHeight * state.currentPdf.zoom;
  const extraX = Math.max((scaledWidth - stageBox.width) / 2 + 48, 0);
  const maxPanY = 48;
  const minPanY = -Math.max(scaledHeight - stageBox.height + 48, 0);

  state.currentPdf.panX = clamp(state.currentPdf.panX, -extraX, extraX);
  state.currentPdf.panY = clamp(state.currentPdf.panY, minPanY, maxPanY);
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));
  renderAll();
  if (el.sections.detail.classList.contains("active")) {
    const item = state.itemsById.get(id);
    if (item) {
      el.detailContent.innerHTML = detailHtml(item);
      setFavoriteIcons(el.detailContent);
      hydrateLocalImages(el.detailContent);
    }
  }
}

function addFavoriteDivider() {
  const favoriteItemCount = getFavoriteRows().filter((row) => row.kind === "item").length;
  if (favoriteItemCount < 3) return;
  const id = `${FAVORITE_DIVIDER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const currentIds = Array.from(state.favorites);
  currentIds.push(id);
  state.favorites = new Set(currentIds);
  state.favoriteReorderMode = true;
  writeJson(STORAGE_KEYS.favorites, currentIds);
  renderFavorites();
}

function removeFavoriteDivider(id) {
  if (!isFavoriteDividerId(id)) return;
  state.favorites.delete(id);
  writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));
  renderFavorites();
}

function saveFavoriteOrder(orderedIds) {
  const nextIds = [];
  orderedIds.forEach((id) => {
    if (state.favorites.has(id) && !nextIds.includes(id)) nextIds.push(id);
  });
  state.favorites.forEach((id) => {
    if (!nextIds.includes(id)) nextIds.push(id);
  });

  state.favorites = new Set(nextIds);
  writeJson(STORAGE_KEYS.favorites, nextIds);
  renderFavorites();
}

function rememberOpened(item, pageNumber) {
  writeJson(STORAGE_KEYS.lastOpened, {
    id: item.id,
    type: item.type,
    page: pageNumber || null,
    openedAt: new Date().toISOString()
  });

  const recents = readJson(STORAGE_KEYS.recents, []);
  const next = [item.id, ...recents.filter((id) => id !== item.id)].slice(0, 8);
  writeJson(STORAGE_KEYS.recents, next);
}

function getRecentItems() {
  return readJson(STORAGE_KEYS.recents, [])
    .map((id) => state.itemsById.get(id))
    .filter(Boolean);
}

function getSavedPdfPage(itemId) {
  const pages = readJson(STORAGE_KEYS.pdfPages, {});
  return Number(pages[itemId]) || 1;
}

function savePdfPage() {
  const item = state.currentPdf.item;
  if (!item) return;
  const pages = readJson(STORAGE_KEYS.pdfPages, {});
  pages[item.id] = state.currentPdf.pageNumber;
  writeJson(STORAGE_KEYS.pdfPages, pages);
}

function saveLists() {
  writeJson(STORAGE_KEYS.lists, state.lists);
}

function toggleListEditMode() {
  if (state.listEditMode) {
    const active = getActiveList();
    if (active) {
      const draft = document.getElementById("listTitleDraft");
      if (draft) updateListTitle(active.id, draft.value);
    }
    state.listEditMode = false;
    renderLists();
    return;
  }
  state.listEditMode = !state.listEditMode;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  renderLists();
}

function toggleListPicker() {
  if (!state.lists.length) {
    createList();
    return;
  }
  state.listPickerOpen = !state.listPickerOpen;
  state.listPickerMessage = "";
  renderLists();
}

function selectList(listId) {
  if (!state.lists.some((list) => list.id === listId)) return;
  const shouldCollapse = state.activeListId === listId && state.expandedListId === listId;
  state.activeListId = listId;
  state.expandedListId = shouldCollapse ? "" : listId;
  el.listSelect.value = listId;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  state.listEditMode = false;
  closeListMoreMenu();
  renderLists();
}

function editListFromRow(listId) {
  if (!state.lists.some((list) => list.id === listId)) return;
  openListEditModal(listId);
}

function openListEditModal(listId) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return;

  state.activeListId = list.id;
  state.expandedListId = list.id;
  state.editingListId = list.id;
  state.listEditMode = false;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  closeListMoreMenu();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = list.id;
  renderLists();
  renderListEditModal();
  el.listEditModal.classList.remove("hidden");
  fitOpenMobileModals();
  el.listEditTitleField.focus();
}

function closeListEditModal() {
  if (!el.listEditModal || el.listEditModal.classList.contains("hidden")) return;
  el.listEditModal.classList.add("hidden");
  clearModalPanelLayout(el.listEditPanel);
  fitOpenMobileModals();
  state.editingListId = "";
  el.listEditStatus.textContent = "";
}

function saveListEditModal(event) {
  event.preventDefault();
  if (document.activeElement === el.listEditSearch) {
    renderListEditResults();
    return;
  }
  if (!state.editingListId) return;
  updateListTitle(state.editingListId, el.listEditTitleField.value);
  closeListEditModal();
  renderLists();
}

function saveCurrentModalListTitle() {
  if (!state.editingListId) return;
  updateListTitle(state.editingListId, el.listEditTitleField.value);
}

function renderListEditModal() {
  const list = state.lists.find((candidate) => candidate.id === state.editingListId);
  if (!list) {
    closeListEditModal();
    return;
  }

  el.listEditTitle.textContent = "Edit list";
  el.listEditTitleField.value = list.title || "";
  renderListEditItems(list);
  renderListEditResults();
}

function renderListEditItems(list) {
  const entries = getResolvedListEntries(list);

  if (!entries.length) {
    el.listEditItems.innerHTML = `<div class="empty-state compact-empty"><p>No items yet.</p></div>`;
    return;
  }

  el.listEditItems.innerHTML = entries.map((entry) => {
    const title = itemDisplayTitle(entry.item);
    const page = entry.page || entry.item.page;
    const meta = [
      page ? `p. ${page}` : "",
      entry.item.book || entry.item.category || "",
      entry.item.type || ""
    ].filter(Boolean).join(" - ");
    const value = `${escapeHtml(list.id)}:${entry.manualIndex}`;
    return `
      <div class="list-edit-item-row">
        <div class="list-edit-item-main">
          <span class="compact-title">${escapeHtml(title)}</span>
          ${meta ? `<span class="compact-meta">${escapeHtml(meta)}</span>` : ""}
        </div>
        <div class="list-edit-item-actions">
          <button class="icon-button" type="button" data-edit-item="${escapeHtml(entry.item.id)}" data-edit-context="lists" aria-label="Edit ${escapeHtml(title)}" title="Edit item">&#9998;</button>
          <button class="icon-button" type="button" data-list-modal-move="${value}:up" aria-label="Move ${escapeHtml(title)} up" title="Move up">&#8593;</button>
          <button class="icon-button" type="button" data-list-modal-move="${value}:down" aria-label="Move ${escapeHtml(title)} down" title="Move down">&#8595;</button>
          <button class="icon-button remove-button" type="button" data-list-modal-remove="${value}" aria-label="Remove ${escapeHtml(title)} from list" title="Remove from list">&times;</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderListEditResults() {
  if (!state.editingListId) return;
  const list = state.lists.find((candidate) => candidate.id === state.editingListId);
  if (!list) return;

  const query = el.listEditSearch.value || "";
  const existingIds = new Set((list.entries || []).map((entry) => entry.itemId));
  const items = state.data.items
    .filter(isLibraryContentItem)
    .filter((item) => matchesQuery(item, query))
    .sort(compareTitle)
    .slice(0, 80);

  if (!items.length) {
    el.listEditResults.innerHTML = `<div class="empty-state compact-empty"><p>No matching items.</p></div>`;
    return;
  }

  el.listEditResults.innerHTML = items.map((item) => `
    <label class="checklist-row">
      <input class="setlist-check" type="checkbox" data-list-modal-check="${escapeHtml(item.id)}" ${existingIds.has(item.id) ? "checked" : ""}>
      <span class="checklist-main">
        <span class="picker-title">${escapeHtml(itemDisplayTitle(item))}</span>
        <small>${escapeHtml(compactMetaText(item))}</small>
      </span>
      <span class="type-pill compact-type">${escapeHtml(item.type)}</span>
    </label>
  `).join("");
}

function toggleListItemFromModal(itemId, checked) {
  if (!state.editingListId) return;
  saveCurrentModalListTitle();
  if (checked) {
    addItemToList(state.editingListId, itemId);
    const item = state.itemsById.get(itemId);
    el.listEditStatus.textContent = item ? `Added ${itemDisplayTitle(item)}.` : "Added item.";
  } else {
    removeListItemByItemId(state.editingListId, itemId);
    const item = state.itemsById.get(itemId);
    el.listEditStatus.textContent = item ? `Removed ${itemDisplayTitle(item)}.` : "Removed item.";
  }
  renderListEditModal();
}

function moveListItemFromModal(value) {
  saveCurrentModalListTitle();
  moveListItem(value);
  renderListEditModal();
}

function updateListTitle(listId, title) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return;
  list.title = title.trim() || "Untitled List";
  saveLists();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = state.activeListId;
}

function saveListTitleFromEditor(listId) {
  const draft = document.getElementById("listTitleDraft");
  updateListTitle(listId, draft?.value || "");
  state.listEditMode = false;
  renderLists();
}

function createList(title = "", entries = []) {
  const list = {
    id: createLocalListId("list"),
    title,
    showCheckboxes: false,
    userCreated: true,
    entries
  };
  state.lists.push(list);
  state.activeListId = list.id;
  saveLists();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = list.id;
  state.listEditMode = false;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  renderLists();
  openListEditModal(list.id);
}

function deleteList(listId) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return;
  const ok = window.confirm(`Delete "${list.title}"? This only removes the list, not the songs.`);
  if (!ok) return;

  state.lists = state.lists.filter((candidate) => candidate.id !== listId);
  state.activeListId = state.lists[0]?.id || "";
  saveLists();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = state.activeListId;
  renderLists();
}

function addItemToList(listId, itemId, pageValue = "") {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list || !itemId) return;
  const item = state.itemsById.get(itemId);
  list.entries = list.entries || [];
  if (list.entries.some((entry) => entry.itemId === itemId)) return;
  const entry = { itemId, checked: false };
  const page = Number(pageValue);
  if (page) entry.page = page;
  list.entries.push(entry);
  state.listPickerMessage = item ? `Added ${itemDisplayTitle(item)}.` : "Added item.";
  const pageInput = document.getElementById("listPickerPage");
  if (pageInput) pageInput.value = "";
  saveLists();
  renderLists();
}

function moveListItem(value) {
  const [listId, indexText, direction] = value.split(":");
  const list = state.lists.find((candidate) => candidate.id === listId);
  const index = Number(indexText);
  if (!list?.entries?.[index]) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.entries.length) return;

  const [entry] = list.entries.splice(index, 1);
  list.entries.splice(targetIndex, 0, entry);
  saveLists();
  renderLists();
}

function removeListItem(value) {
  const [listId, indexText] = value.split(":");
  const list = state.lists.find((candidate) => candidate.id === listId);
  const index = Number(indexText);
  if (!list?.entries?.[index]) return;
  list.entries.splice(index, 1);
  saveLists();
  renderLists();
}

function removeListItemByItemId(listId, itemId) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list?.entries?.length) return;
  list.entries = list.entries.filter((entry) => entry.itemId !== itemId);
  saveLists();
  renderLists();
}

function confirmAndRemoveListItem(value) {
  const ok = window.confirm("Remove this item from this list?");
  if (!ok) {
    closeSwipeRows();
    return;
  }
  removeListItem(value);
  closeSwipeRows();
}

function getActiveList() {
  return state.lists.find((list) => list.id === state.activeListId) || state.lists[0];
}

function createLocalListId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function filterItems(items, query) {
  return (items || []).filter((item) => matchesQuery(item, query));
}

function isFileItem(item) {
  return Boolean(item?.id && FILE_ITEM_TYPES.has(item.type));
}

function isLibraryContentItem(item) {
  return Boolean(item?.id && LIBRARY_CONTENT_TYPES.has(item.type));
}

function itemDisplayTitle(item) {
  const candidates = [
    item?.title,
    item?.fileName,
    item?.imageFileName,
    item?.url,
    titleFromId(item?.id)
  ];
  for (const candidate of candidates) {
    const title = normalizeVisibleText(candidate);
    if (title) return title;
  }
  return "Untitled";
}

function normalizeVisibleText(value) {
  return String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function titleFromId(id) {
  const text = normalizeVisibleText(id).replace(/[-_]+/g, " ");
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
}

function matchesQuery(item, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;
  return searchableText(item).includes(normalizedQuery);
}

function searchableText(item) {
  return normalize([
    itemDisplayTitle(item),
    item.title,
    item.type,
    item.category,
    item.book,
    item.page,
    item.url,
    item.fileName,
    item.fileMime,
    item.imageFileName,
    item.aliases?.join(" "),
    item.tags?.join(" "),
    item.notes,
    item.key,
    item.capo,
    item.startingNote,
    item.content?.join(" "),
    item.cardHtml ? htmlToPlainText(item.cardHtml) : "",
    item.body
  ].filter(Boolean).join(" "));
}

function sortItems(items, mode) {
  const copy = items.slice();
  if (mode === "page") {
    return copy.sort(comparePageThenTitle);
  }
  if (mode === "alpha") {
    return copy.sort(compareTitle);
  }
  return copy.sort((a, b) => {
    const categoryCompare = (a.category || "").localeCompare(b.category || "");
    return categoryCompare || compareTitle(a, b);
  });
}

function sortLibraryItems(items, mode) {
  const copy = items.slice();
  if (mode === "alpha") {
    return copy.sort(compareTitle);
  }

  return copy.sort((a, b) => {
    const aValue = librarySortValue(a, mode);
    const bValue = librarySortValue(b, mode);
    const aHasValue = Boolean(aValue);
    const bHasValue = Boolean(bValue);

    if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
    return aValue.localeCompare(bValue) || compareTitle(a, b);
  });
}

function librarySortValue(item, mode) {
  if (mode === "category") return item.category || "";
  if (mode === "book") return item.book || "";
  if (mode === "composer") return item.composer || "";
  if (mode === "tag") return (item.tags || []).join(", ");
  return itemDisplayTitle(item);
}

function sortQuickEntries(entries, mode) {
  const copy = entries.slice();
  if (mode === "alpha") {
    return copy.sort((a, b) => compareTitle(a.item, b.item));
  }
  if (mode === "page") {
    return copy.sort((a, b) => comparePageThenTitle(a.item, b.item));
  }
  return copy.sort((a, b) => a.manualIndex - b.manualIndex);
}

function compareTitle(a, b) {
  return itemDisplayTitle(a).localeCompare(itemDisplayTitle(b));
}

function comparePageThenTitle(a, b) {
  const aPage = Number(a.page) || Number.MAX_SAFE_INTEGER;
  const bPage = Number(b.page) || Number.MAX_SAFE_INTEGER;
  return aPage - bPage || compareTitle(a, b);
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function metaHtml(item) {
  const parts = [
    item.category,
    item.book,
    item.page ? `p. ${item.page}` : ""
  ].filter(Boolean);
  if (!parts.length) return "";
  return `<div class="meta-line">${parts.map((part) => `<span>${escapeHtml(part)}</span>`).join("")}</div>`;
}

function compactLibraryMetaText(item) {
  const pieces = [];
  if (item.page) pieces.push(`p. ${item.page}`);
  const locator = item.book || item.composer || item.category || "";
  if (locator) pieces.push(locator);
  return pieces.join(" \u00b7 ");
}

function setlistMeta(item, entry) {
  const page = entry.page || item.page;
  const pieces = [
    page ? `p. ${page}` : "",
    item.type,
    entry.notes || item.notes || ""
  ].filter(Boolean);
  return escapeHtml(pieces.join(" · "));
}

function tagsHtml(tags) {
  if (!tags?.length) return "";
  return `<div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function compactMetaText(item) {
  return [
    item.book,
    item.composer,
    item.category,
    item.page ? `p. ${item.page}` : "",
    item.type
  ].filter(Boolean).join(" - ");
}

function libraryOptionsHtml() {
  return state.data.items
    .slice()
    .sort(compareTitle)
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(itemDisplayTitle(item))} (${escapeHtml(item.type)})</option>`)
    .join("");
}

function emptyState() {
  return document.getElementById("emptyStateTemplate").content.firstElementChild.cloneNode(true);
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage limits can block writes; the app remains usable.
  }
}

async function exportBackup() {
  try {
    const data = {
      importedItems: readJson(STORAGE_KEYS.importedItems, []),
      itemEdits: readJson(STORAGE_KEYS.itemEdits, {}),
      lists: readJson(STORAGE_KEYS.lists, state.lists),
      quickIndexes: readJson(STORAGE_KEYS.quickIndexes, state.data.quickIndexes || []),
      setlists: readJson(STORAGE_KEYS.setlists, state.data.setlists || []),
      favorites: readJson(STORAGE_KEYS.favorites, []),
      lastOpened: readJson(STORAGE_KEYS.lastOpened, null),
      quickChecks: readJson(STORAGE_KEYS.quickChecks, {}),
      pdfPages: readJson(STORAGE_KEYS.pdfPages, {}),
      recents: readJson(STORAGE_KEYS.recents, []),
      settings: readJson(STORAGE_KEYS.settings, {}),
      starterFavorites: readJson(STORAGE_KEYS.starterFavorites, []),
      starterLists: readJson(STORAGE_KEYS.starterLists, []),
      deletedItems: readJson(STORAGE_KEYS.deletedItems, [])
    };
    const fileIds = collectLocalFileIds(data);
    const { files, missingFileIds } = await collectBackupFiles(fileIds);
    const backup = {
      app: "kens-music-app",
      version: 2,
      exportedAt: new Date().toISOString(),
      note: "Private app export. Includes lists, favorites, cards, links, metadata, and uploaded local file blobs when available. Share only with people who should receive those files.",
      data,
      files,
      missingFileIds
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kens-music-app-data-and-files-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    if (missingFileIds.length) {
      window.alert("The export was created, but one or more local files could not be found. The visible app data was still included.");
    }
  } catch {
    window.alert("The app data and files could not be exported from this browser.");
  }
}

function importBackupFromFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const backup = JSON.parse(String(reader.result || "{}"));
      const data = backup.data || backup;
      const fileRecords = Array.isArray(backup.files) ? backup.files : Array.isArray(data.files) ? data.files : [];
      const ok = window.confirm("Import this app data and included files? This will replace local lists, favorites, cards, links, and item metadata on this device.");
      if (!ok) return;

      await restoreBackupFiles(fileRecords);
      writeJson(STORAGE_KEYS.importedItems, data.importedItems || []);
      writeJson(STORAGE_KEYS.itemEdits, data.itemEdits || {});
      if (data.lists) {
        writeJson(STORAGE_KEYS.lists, data.lists);
      } else {
        localStorage.removeItem(STORAGE_KEYS.lists);
      }
      writeJson(STORAGE_KEYS.quickIndexes, data.quickIndexes || []);
      writeJson(STORAGE_KEYS.setlists, data.setlists || []);
      writeJson(STORAGE_KEYS.favorites, data.favorites || []);
      if (data.lastOpened) {
        writeJson(STORAGE_KEYS.lastOpened, data.lastOpened);
      } else {
        localStorage.removeItem(STORAGE_KEYS.lastOpened);
      }
      writeJson(STORAGE_KEYS.quickChecks, data.quickChecks || {});
      writeJson(STORAGE_KEYS.pdfPages, data.pdfPages || {});
      writeJson(STORAGE_KEYS.recents, data.recents || []);
      writeJson(STORAGE_KEYS.settings, data.settings || {});
      writeJson(STORAGE_KEYS.starterFavorites, data.starterFavorites || []);
      writeJson(STORAGE_KEYS.starterLists, data.starterLists || []);
      writeJson(STORAGE_KEYS.deletedItems, data.deletedItems || []);
      window.location.reload();
    } catch {
      window.alert("That app data file could not be imported.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
