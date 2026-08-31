# First Class TickLeap Helper

## Chrome Web Store listing

**Name**

First Class TickLeap Helper

**Short description**

Send the public UK TickLeap Daily Rankings to First Class Data Space.

**Detailed description**

This helper connects the public TikLeap UK Daily Rankings page with First Class Data Space. From the Daily Rankings page in First Class Data Space, select “Pull UK Rankings from Chrome.” The helper reads the visible UK Daily Rankings usernames from TickLeap and returns them directly to the Data Space page, ready to save and share with authorised users.

It does not collect passwords, payment information, browsing history, or private TickLeap account information. It only reads the public ranking usernames on https://www.tikleap.com/country/gb after the user starts a pull from First Class Data Space.

**Category**

Productivity

## Single purpose

Transfer the public UK TickLeap Daily Rankings usernames to First Class Data Space when a user requests it.

## Permissions justification

- `tabs`: Finds or opens the public UK TickLeap rankings tab so the requested names can be read.
- `https://www.tikleap.com/*`: Reads the public UK Daily Rankings page.
- `https://firstclassagency.management/*`: Delivers the requested usernames directly to First Class Data Space.

## Privacy

The extension does not sell, transfer, or use personal data for advertising. It only transfers public TickLeap ranking usernames from the UK rankings page to First Class Data Space after a user requests the pull.
