This article is the **authoritative source about the RADIO framework**.

Start by understanding the **R**equirements, defining the high level **A**rchitecture and the **D**ata model. Then define the **I**nterfaces between the components in the product and talk about any **O**ptimizations or dive deep into specific areas which require special attention.

- **Requirements exploration**: Understand the problem thoroughly and determine the scope by asking a number of clarifying questions
- **Architecture / high-level design**: Identify the key components of the product and how they are related to each other
- **Data model / core entities**: Describe the core entities and its data – the fields each entity contains and which component(s) they belong to
- **Interface definition (API)**: Define the interface (API) between components in the product, functionality of each API, their parameters and responses
- **Optimizations and deep dive**: Discuss possible optimization opportunities and specific areas of interest when building the product

## Using RADIO framework in interviews

You **should not** follow the steps in rigid, linear order (Requirements -> Architecture -> Data model -> Interface -> Optimizations). The framework's main purpose is to ensure you cover all critical aspects of the design in a systematic way. In a real interview, the discussion is often iterative and it makes sense to revisit the various aspects as you handle more features. ==You might even change the architecture entirely along the way and that is alright (if you have a good reason).==

The initial step, Requirements exploration (**R**), is the most crucial step to start with. You cannot design a product without first understanding what problems it needs to solve and the target audience.

You should feel free to backtrack and re-address earlier sections based on new insights or interviewer feedback. For example:

- During the Architecture (**A**) phase, if you realize a feature requirement from **R** means your initial Data model (**D**) won't work or isn't ideal, you should immediately go back and revise the Data model (**D**).
- The interviewer might interrupt and ask for a Deep Dive (**O**) into a component immediately after you mention it in the Architecture (**A**) step (unlikely but possible). You should be prepared to follow their lead. However, do remember to resume from where you left off if you have not completed a holistic design of the product and covered every aspect in the core design phase (Architecture (**A**), Data model (**D**), and Interface (**I**)).

## Requirements exploration

**Objective**: Understand the problem thoroughly and determine the scope by asking a number of clarifying questions.

**==Recommended duration: Not more than 10% of the session.==**

System design interview questions are open-ended in nature and are usually vague and under-specified on purpose. **You are required to dig deeper and clarify ambiguities in the problem by asking useful questions.** Treat your interviewer as a product manager you are working with on a new project, ask enough questions so that you know what problems you are trying to solve and what you need to build.

### What are the main use cases we should be focusing on?

Imagine you were asked to "Design Facebook". Facebook is a huge platform, there's news feed, profiles, friends, groups, stories, and more. Which parts of Facebook should you focus on? The interviewer has the answer in mind but wants you to find out by asking questions. Typically you should focus on the most unique aspects of the product, the features which define it. For Facebook, it would be the news feed, pagination of the feed, and creating new posts. For YouTube, it would be the video-watching experience. **The important areas for other types of products can be found in the [types of questions](https://www.greatfrontend.com/front-end-system-design-playbook/types-of-questions#important-areas).**


### What are the functional requirements and non-functional requirements?

Firstly, what are functional and non-functional requirements?

- **Functional requirements**: Basic requirements of the product such that the product cannot function without them. This is usually whether a user can complete the core flows correctly.
- **Non-functional requirements**: Requirements that are viewed as improvements to the product, but not strictly required for the product to be usable, i.e. the product can still be used without these. These include performance (how fast the page loads, how fast an interaction takes), scalability (how many items can be present on the page before the page slows to a crawl), good user experience, etc.

There are two ways you can get the answer to this question:

1. Take the initiative to list out what you think are the requirements and get feedback and alignment from the interviewer (Preferred).
2. Ask the interviewer directly. However, most of the time they'd want you to define them. Even if they give you an answer, it won't be too detailed.

At the very least, your design has to meet the functional requirements. After meeting all the functional requirements, move on to talk about how to fulfill the non-functional requirements.

### Other possible questions

- What devices/platforms (desktop/tablet/mobile) need to be supported?
- Who are the main users of the product?
- Will the app be used offline?
- What are the performance requirements, if any? Performance requirements typically fall under non-functional requirements.

## Architecture / high-level design

**Objective**: Identify the key components of the product and how they are related to each other.

**Recommended duration**: Roughly 20% of the session.

### Typical components/modules

Examples of components/modules which are commonly found in the high-level design of front end apps:

- **Server**: In front end system design interviews, we can treat the server as a black box and assume it exposes some APIs you can call via HTTP / GraphQL / WebSockets.
- **View layer**: This represents what the user sees and interacts with and usually contains smaller subviews within it as well as local state. In modern web applications, the view layer is implemented using JavaScript frameworks like React, Vue, or Svelte components. View is responsible for presentation and local interaction state, and that cross-cutting data (shared between multiple views) should live in the store/model layer.
- **Store/model layer**: This is where the application's data and derived state live. The store manages cross-cutting data such as user profile, authentication, app layout state (e.g. whether the sidebar is open), shared domain data, etc.. Modern approaches favor unidirectional data flow and reactive state management, implemented with state management libraries like Redux Toolkit, Zustand, Jotai, or MobX.
- **Data access layer**: The front end interacts with this layer through a typed data access layer (e.g., React Query, tRPC, Apollo Client) that handles fetching, caching, and error management. This abstraction allows the client to consume APIs without being tightly coupled to data origin and associated implementation details. An application can start introducing offline storage with periodic background syncing and this is the only layer that is affected. The other layers above do not care about where the data comes from.

Diagrams are your friends here. Each component can be represented using a rectangle and your high-level design usually ends up looking like a few rectangular boxes with arrows connecting the boxes, labelled with data that flows between them. It is also possible to have components within components; in that case, draw the parent using bigger rectangles since they need to fit multiple subcomponents.

## Data model

**Objective**: Describe the various data entities, the fields they contain and which component(s) they belong to.

**Recommended duration**: Roughly 10% of the session.

There are two kinds of data on client applications:

### Server-originated data

Data that originates from the server, usually from a database and meant to be seen by multiple people or accessed from multiple different devices. Common examples include user data (name, profile picture) and user-generated data (feed posts, comments).

### Client-only data

Client-only data, also commonly known as UI state, is data that only needs to live on the client and does not have to be sent to the server to be persisted into a database.

Client data can be further broken down into:

- **Data to be persisted**: Data that usually has to be sent to the server and saved into a database for it to be useful. Examples include data the user enters into forms, profile settings, etc.
- **Ephemeral data**: Temporary data that is acceptable to be lost forever when the browser tab is closed. Common examples include form validation state, current navigation tab, whether a section is expanded, etc.

## Interface definition 

**Objective**: Define the interface between components in the product, functionality of the various APIs, their parameters and responses.

**Recommended duration**: Roughly 20% of the session.

With the architectural components and data model defined, we can move on to discuss the interface (APIs) between the components. API is an overloaded term and generally refers to the protocol which software components communicate and request/send data between them.

Servers and clients communicate by exchanging messages over a network, following agreed-upon protocols (e.g. HTTP, WebSocket, Server-sent Events) that define how data is structured, transmitted, and understood on both sides.

Within the browser, client components generally communicate via event listeners and callback functions.

Regardless of components involved, all APIs have three things in common:

|Parts of an API|Server-client|Client-client|
|---|---|---|
|Name and functionality|HTTP path|JavaScript function / Event name|
|Parameters|HTTP GET query and POST parameters|Function / event parameters|
|Return Value|HTTP response, typically JSON format|Return values (optional)|