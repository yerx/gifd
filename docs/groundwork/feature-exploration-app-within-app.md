# Feature Exploration: App-Within-an-App Platform

## Thesis

People will start building their own apps and they will leave some of the apps that they are subscribed to. For example, instead of subscribing to Strava, you build a Strava clone at home with AI — rather, with our app.

You can easily share your app and select data with other users who opt into your app. We will have APIs for each user so they decide what they want to share.

This is the app we're trying to build. We're not even close to being there yet.

## First Feature: Productivity App

The first app-within-an-app that we will build is a **productivity app**.

There is **one starting template** (call it the default template). From there, the user talks to their AI agent to change the UI and behavior of their app — adding fields, changing layouts, adjusting flows, etc.

## Core Architectural Bet

**If we have the right data tables, we should be able to build anything on top of them.**

The platform's foundation is well-modeled data. UI and behavior are malleable layers the AI agent generates and edits in conversation with the user. This means:

- Data schema design is the highest-leverage decision.
- The starting template is essentially "a good set of data tables + a reasonable default UI."
- Customization = the agent rewriting UI/behavior against the same tables (or extending the schema when needed).

## Design Principles

This app will be optimized for:

- **The end user (the human)** — the experience the person interacts with directly.
- **The LLM / AI agent** — so the agent is best prepared to build what the human user wants on top of the existing data tables.

## Status

Exploring this feature. Prompt captured for reference.
