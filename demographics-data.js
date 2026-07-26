(function () {
  "use strict";

  window.UTAH_DEMOGRAPHICS_SNAPSHOT = [
    {
      value: "3,271,616",
      label: "Utah residents",
      note: "2020 Census",
    },
    {
      value: "29",
      label: "counties",
      note: "From Cache to Washington",
    },
    {
      value: "10 years",
      label: "between censuses",
      note: "The official nationwide count",
    },
  ];

  window.UTAH_DEMOGRAPHICS_CONCEPTS = [
    {
      id: "population",
      title: "Population",
      summary: "The number of people living in a defined place.",
    },
    {
      id: "age",
      title: "Age",
      summary: "How residents are distributed across stages of life.",
    },
    {
      id: "household",
      title: "Households",
      summary: "People who occupy the same housing unit.",
    },
    {
      id: "migration",
      title: "Migration",
      summary: "Movement into, out of, or within Utah.",
    },
    {
      id: "density",
      title: "Population density",
      summary: "The average number of people living in a unit of land area.",
    },
    {
      id: "education-income",
      title: "Education & income",
      summary: "Measures that help describe opportunity and economic conditions.",
    },
  ];

  window.UTAH_DEMOGRAPHICS_PLACES = [
    { id: "salt-lake", place: "Salt Lake City", county: "Salt Lake County", region: "Wasatch Front" },
    { id: "provo-orem", place: "Provo & Orem", county: "Utah County", region: "Wasatch Front" },
    { id: "ogden", place: "Ogden", county: "Weber County", region: "Wasatch Front" },
    { id: "st-george", place: "St. George", county: "Washington County", region: "Southwest Utah" },
    { id: "logan", place: "Logan", county: "Cache County", region: "Northern Utah" },
    { id: "park-city", place: "Park City", county: "Summit County", region: "Wasatch Back" },
    { id: "moab", place: "Moab", county: "Grand County", region: "Southeast Utah" },
    { id: "vernal", place: "Vernal", county: "Uintah County", region: "Uinta Basin" },
  ];

  window.UTAH_DEMOGRAPHICS_TERM_PAIRS = [
    {
      id: "population",
      term: "Population",
      definition: "The number of people living in a defined place.",
    },
    {
      id: "demographics",
      term: "Demographics",
      definition: "Statistics that describe people and communities.",
    },
    {
      id: "density",
      term: "Population density",
      definition: "People per unit of land area.",
    },
    {
      id: "census",
      term: "Census",
      definition: "The official nationwide population count conducted every 10 years.",
    },
    {
      id: "migration",
      term: "Migration",
      definition: "Movement from one place to another.",
    },
    {
      id: "household",
      term: "Household",
      definition: "People who occupy the same housing unit.",
    },
  ];

  window.UTAH_DEMOGRAPHICS_QUESTIONS = [
    {
      id: "q-salt-lake",
      category: "places",
      prompt: "Which county contains Salt Lake City?",
      answer: "Salt Lake County",
      choices: ["Salt Lake County", "Utah County", "Davis County"],
      explanation: "Salt Lake City is the county seat of Salt Lake County.",
    },
    {
      id: "q-provo",
      category: "places",
      prompt: "Which county contains Provo and Orem?",
      answer: "Utah County",
      choices: ["Utah County", "Wasatch County", "Weber County"],
      explanation: "Provo and Orem are both in Utah County.",
    },
    {
      id: "q-ogden",
      category: "places",
      prompt: "Which county contains Ogden?",
      answer: "Weber County",
      choices: ["Weber County", "Davis County", "Cache County"],
      explanation: "Ogden is the county seat of Weber County.",
    },
    {
      id: "q-st-george",
      category: "places",
      prompt: "Which county contains St. George?",
      answer: "Washington County",
      choices: ["Washington County", "Iron County", "Kane County"],
      explanation: "St. George is the county seat of Washington County.",
    },
    {
      id: "q-logan",
      category: "places",
      prompt: "Which county contains Logan?",
      answer: "Cache County",
      choices: ["Cache County", "Box Elder County", "Rich County"],
      explanation: "Logan is the county seat of Cache County.",
    },
    {
      id: "q-park-city",
      category: "places",
      prompt: "Which county contains Park City?",
      answer: "Summit County",
      choices: ["Summit County", "Wasatch County", "Morgan County"],
      explanation: "Park City is in Summit County.",
    },
    {
      id: "q-moab",
      category: "places",
      prompt: "Which county contains Moab?",
      answer: "Grand County",
      choices: ["Grand County", "San Juan County", "Emery County"],
      explanation: "Moab is the county seat of Grand County.",
    },
    {
      id: "q-vernal",
      category: "places",
      prompt: "Which county contains Vernal?",
      answer: "Uintah County",
      choices: ["Uintah County", "Duchesne County", "Daggett County"],
      explanation: "Vernal is the county seat of Uintah County.",
    },
    {
      id: "q-demographics",
      category: "concepts",
      prompt: "What does demographics usually describe?",
      answer: "People and communities",
      choices: ["People and communities", "Only weather", "Only land elevation"],
      explanation: "Demographics uses statistics to describe people and communities.",
    },
    {
      id: "q-density",
      category: "concepts",
      prompt: "Which measure helps show how closely people live together?",
      answer: "Population density",
      choices: ["Population density", "Elevation", "Annual snowfall"],
      explanation: "Population density compares population with land area.",
    },
    {
      id: "q-census",
      category: "concepts",
      prompt: "What official U.S. count happens every 10 years?",
      answer: "The census",
      choices: ["The census", "A state election", "A property survey"],
      explanation: "The decennial census counts the population every 10 years.",
    },
    {
      id: "q-migration",
      category: "concepts",
      prompt: "What term means movement from one place to another?",
      answer: "Migration",
      choices: ["Migration", "Density", "Household"],
      explanation: "Migration includes movement into, out of, or within Utah.",
    },
    {
      id: "q-household",
      category: "concepts",
      prompt: "What is a household in Census terminology?",
      answer: "People occupying one housing unit",
      choices: ["People occupying one housing unit", "Everyone in one county", "Only related family members"],
      explanation: "A household includes the people who occupy the same housing unit.",
    },
    {
      id: "q-population",
      category: "concepts",
      prompt: "What does population measure?",
      answer: "The number of people in a place",
      choices: ["The number of people in a place", "The size of the land", "The age of a city"],
      explanation: "Population is the number of people living in a defined place.",
    },
    {
      id: "q-map",
      category: "concepts",
      prompt: "Which map best shows where people live?",
      answer: "A population density map",
      choices: ["A population density map", "A highway-only map", "A geologic map"],
      explanation: "A population density map shows how population is distributed across an area.",
    },
    {
      id: "q-utah-counties",
      category: "concepts",
      prompt: "How many counties does Utah have?",
      answer: "29",
      choices: ["29", "40", "50"],
      explanation: "Utah has 29 counties.",
    },
  ];
})();
