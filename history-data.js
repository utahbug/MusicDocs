(function () {
  "use strict";

  window.UTAH_HISTORY_EVENTS = [
    {
      id: "paleoindian",
      sortKey: -11000,
      date: "11,000 BCE",
      title: "People live in this place",
      summary:
        "Utah’s archaeological timeline begins with the Paleoindian period. Native peoples have shaped this region for thousands of years.",
      sourceLabel: "Utah archaeology timeline",
      sourceUrl:
        "https://ilovehistory.utah.gov/wp-content/uploads/2021/12/Utah_Archaeology_Timeline_Key.pdf",
    },
    {
      id: "fremont-puebloan",
      sortKey: 500,
      date: "c. 500–1300",
      title: "Communities farm, build, and create",
      summary:
        "Fremont and Ancestral Puebloan communities raised crops, made pottery, built homes, and left rock imagery across parts of present-day Utah.",
      sourceLabel: "Utah archaeology timeline",
      sourceUrl:
        "https://ilovehistory.utah.gov/wp-content/uploads/2021/12/Utah_Archaeology_Timeline_Key.pdf",
    },
    {
      id: "escalante",
      sortKey: 1776,
      date: "1776",
      title: "The Domínguez–Escalante expedition",
      summary:
        "A Spanish expedition traveled through the region while seeking an overland route between New Mexico and California.",
      sourceLabel: "Utah Capitol history timeline",
      sourceUrl:
        "https://utahstatecapitol.utah.gov/wp-content/uploads/Tour-Flash-Cards-for-Web.pdf",
    },
    {
      id: "pioneers",
      sortKey: 1847,
      date: "1847",
      title: "Latter-day Saint pioneers enter the valley",
      summary:
        "The first large company of Latter-day Saint pioneers entered the Salt Lake Valley, beginning a major new migration into Native homelands.",
      image: "pioneer-wagon-people-v3.png",
      imageAlt: "Pioneers traveling with a horse-drawn covered wagon",
      sourceLabel: "Utah Historical Society",
      sourceUrl: "https://history.utah.gov/",
    },
    {
      id: "territory",
      sortKey: 1850,
      date: "1850",
      title: "Congress creates Utah Territory",
      summary:
        "Congress established Utah Territory as part of the Compromise of 1850. The territorial period continued until statehood.",
      sourceLabel: "Utah State Archives",
      sourceUrl: "https://archives.utah.gov/research/digital/territory-project/",
    },
    {
      id: "golden-spike",
      sortKey: 1869,
      date: "May 10, 1869",
      title: "The rails meet at Promontory Summit",
      summary:
        "The Union Pacific and Central Pacific railroads joined at Promontory Summit, completing the first transcontinental railroad.",
      image: "golden-spike-railroad-simple-v2.png",
      imageAlt: "A worker driving the Golden Spike between two locomotives",
      sourceLabel: "National Park Service",
      sourceUrl: "https://www.nps.gov/articles/goldenspike.htm",
    },
    {
      id: "suffrage",
      sortKey: 1870,
      date: "February 14, 1870",
      title: "Seraph Young casts a historic ballot",
      summary:
        "Seraph Young became the first woman in the United States to vote under an equal-suffrage law.",
      sourceLabel: "Utah State Archives",
      sourceUrl:
        "https://archives.utah.gov/2020/02/14/150-years-of-utah-suffrage-stories-of-utah-women/",
    },
    {
      id: "statehood",
      sortKey: 1896,
      date: "January 4, 1896",
      title: "Utah becomes the 45th state",
      summary:
        "After nearly forty-six years as a territory, Utah entered the Union as the nation’s 45th state.",
      sourceLabel: "Utah Senate history",
      sourceUrl: "https://senate.utah.gov/about-the-senate/",
    },
    {
      id: "topaz",
      sortKey: 1942,
      date: "September 11, 1942",
      title: "Topaz opens in central Utah",
      summary:
        "The federal government opened the Topaz incarceration camp near Delta, imprisoning Japanese Americans during World War II.",
      sourceLabel: "National Park Service",
      sourceUrl:
        "https://www.nps.gov/places/central-utah-relocation-center-site.htm",
    },
    {
      id: "rockets",
      sortKey: 1974,
      date: "1974",
      title: "Utah helps power the Space Shuttle",
      summary:
        "NASA awarded Thiokol the contract to develop the Shuttle’s solid rocket motors, which were assembled and tested near Promontory.",
      image: "utah-rocket-workers.png",
      imageAlt:
        "Utah aerospace workers assembling and inspecting a solid rocket motor segment",
      sourceLabel: "NASA",
      sourceUrl:
        "https://ntrs.nasa.gov/api/citations/20120001536/downloads/20120001536.pdf?attachment=true",
    },
    {
      id: "olympics",
      sortKey: 2002,
      date: "February 8–24, 2002",
      title: "Utah hosts the Olympic Winter Games",
      summary:
        "Salt Lake City and venues along the Wasatch Front welcomed athletes from around the world for the 2002 Winter Olympics.",
      sourceLabel: "Olympic Studies Centre",
      sourceUrl:
        "https://library.olympics.com/digitalCollection/DigitalCollectionAttachmentDownloadHandler.ashx?documentId=3703315&parentDocumentId=172552&skipCopyright=true&skipWatermark=true",
    },
  ];

  window.UTAH_HISTORY_QUESTIONS = [
    {
      prompt: "Which period begins Utah’s archaeology timeline around 11,000 BCE?",
      choices: ["Paleoindian", "Fremont", "Territorial"],
      answer: "Paleoindian",
      explanation:
        "The official Utah archaeology timeline begins the Paleoindian period around 11,000 BCE.",
    },
    {
      prompt: "Which expedition traveled through the Utah region in 1776?",
      choices: [
        "Domínguez–Escalante",
        "Lewis and Clark",
        "Donner–Reed",
      ],
      answer: "Domínguez–Escalante",
      explanation:
        "The Domínguez–Escalante expedition crossed the region while seeking a route to California.",
    },
    {
      prompt: "When did the first large company of Latter-day Saint pioneers enter the Salt Lake Valley?",
      choices: ["1847", "1850", "1869"],
      answer: "1847",
      explanation:
        "The pioneer company entered the Salt Lake Valley in July 1847.",
    },
    {
      prompt: "In what year did Congress create Utah Territory?",
      choices: ["1847", "1850", "1896"],
      answer: "1850",
      explanation:
        "Congress created Utah Territory in September 1850 as part of the Compromise of 1850.",
    },
    {
      prompt: "Where did the first transcontinental railroad come together?",
      choices: ["Promontory Summit", "Salt Lake City", "Echo Canyon"],
      answer: "Promontory Summit",
      explanation:
        "The Union Pacific and Central Pacific rails met at Promontory Summit on May 10, 1869.",
    },
    {
      prompt: "Who cast a historic Utah ballot on February 14, 1870?",
      choices: ["Seraph Young", "Martha Hughes Cannon", "Emmeline B. Wells"],
      answer: "Seraph Young",
      explanation:
        "Seraph Young was the first woman in the United States to vote under an equal-suffrage law.",
    },
    {
      prompt: "When did Utah become the 45th state?",
      choices: ["January 4, 1896", "July 24, 1847", "May 10, 1869"],
      answer: "January 4, 1896",
      explanation:
        "Utah entered the Union as the 45th state on January 4, 1896.",
    },
    {
      prompt: "What was Topaz during World War II?",
      choices: [
        "A Japanese American incarceration camp",
        "A military airfield",
        "A copper mine",
      ],
      answer: "A Japanese American incarceration camp",
      explanation:
        "The federal government imprisoned Japanese Americans at Topaz near Delta from 1942 to 1945.",
    },
    {
      prompt: "What major spacecraft component was developed and tested in northern Utah?",
      choices: [
        "Space Shuttle solid rocket motors",
        "Apollo lunar modules",
        "Voyager space probes",
      ],
      answer: "Space Shuttle solid rocket motors",
      explanation:
        "Thiokol developed, assembled, and tested Space Shuttle solid rocket motors near Promontory.",
    },
    {
      prompt: "Which international event did Utah host in 2002?",
      choices: [
        "Olympic Winter Games",
        "World’s Fair",
        "Pan American Games",
      ],
      answer: "Olympic Winter Games",
      explanation:
        "Salt Lake City and nearby mountain venues hosted the 2002 Olympic Winter Games.",
    },
  ];
})();
