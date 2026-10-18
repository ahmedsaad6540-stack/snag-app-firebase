# Copilot Instructions for Snag App Firebase

## Project Overview
This is a **construction snag tracking application** built with React + Vite + Firebase. Users report defects ("snags") on construction sites, categorize them by trade, assign priority/status, and track attachments. The UI is Arabic-first with RTL styling and real-time data synchronization via Firestore.

## Architecture

### Core Technology Stack
- **Frontend**: React 18 + Vite (bundled as SPA)
- **Database**: Firestore (real-time document listener via `onSnapshot`)
- **File Storage**: Firebase Cloud Storage (compressed attachments)
- **SDK**: Firebase SDK v9+ (modular imports)
- **Styling**: Inline CSS objects (no CSS files), RTL support via CSS flexbox

### Key Hooks & Data Flows

**`useSnags()` → [../snag-app/src/hooks/useSnags.js](../snag-app/src/hooks/useSnags.js)**
- Manages all snag CRUD operations and real-time Firestore sync
- Establishes `onSnapshot` listener on "snags" collection (ordered by `timestamp` desc)
- Returns: `{ snags, stats, loading, error, addSnag, cycleStatus, removeSnag, mergeImported }`
- Auto-uploads attachments to Cloud Storage before creating snag document

**`useAttachments()` → [../snag-app/src/hooks/useAttachments.js](../snag-app/src/hooks/useAttachments.js)**
- Client-side attachment processing with max 8 files
- Compresses files via canvas (`fileToDataUrl` in [../snag-app/src/utils/compress.js](../snag-app/src/utils/compress.js))
- Stores in memory with: `{ id, name, size, type, dataUrl }`
- Returns: `{ attachments, addFiles, removeFile, clear }`

**Lookup Helpers → [../snag-app/src/constants/index.js](../snag-app/src/constants/index.js)**
- `tradeOf(tradeId)` - resolves trade enum to display name
- `locOf(locationId)` - location enum resolver
- `priOf(priorityId)` - priority level resolver
- `staOf(statusId)` - status enum resolver
- `typeOf(typeId)` - snag type enum resolver

**Auto-Classification → [../snag-app/src/utils/classify.js](../snag-app/src/utils/classify.js)**
- `classifyLocally(description)` performs keyword matching on Arabic/English text
- Returns trade ID: `"electrical"`, `"plumbing"`, `"painting"`, `"carpentry"`, `"walls"`, `"fire"`, `"security"`, `"civil"`, `"gypsum"`, `"ac"`, or `"general"`

## Project Structure & Key Files

```
snag-app/
  src/
    App.jsx                    # Main component: loads useSnags, renders Header/StatBar/Form/List
    main.jsx                   # Entry point (Vite)
    lib/firebase.js            # Firebase SDK initialization
    hooks/
      useSnags.js              # Firestore real-time listener + CRUD
      useAttachments.js        # Client attachment handling
    components/
      Header.jsx               # App title, export/import controls
      SnagForm.jsx             # New snag input with file upload
      SnagList.jsx             # Display all snags, status cycling
      StatBar.jsx              # Snag counts by status/priority
    utils/
      classify.js              # Auto-trade detection via classifyLocally()
      compress.js              # Canvas-based file compression
      export.js                # JSON export of snags
    constants/
      index.js                 # Enums: TRADES, LOCATIONS, PRIORITIES, STATUSES, TYPES
```

## Setup & Configuration

### Firebase Initialization
1. **Create [../snag-app/src/lib/firebase.js](../snag-app/src/lib/firebase.js):**
   ```javascript
   import { initializeApp } from "firebase/app"
   import { getFirestore } from "firebase/firestore"
   import { getStorage } from "firebase/storage"

   const firebaseConfig = {
     apiKey: process.env.VITE_FIREBASE_API_KEY,
     projectId: process.env.VITE_FIREBASE_PROJECT_ID,
     // ... other config
   }
   export const app = initializeApp(firebaseConfig)
   export const db = getFirestore(app)
   export const storage = getStorage(app)
   ```

2. **Set environment variables** in `.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=...
   ```

3. **Firestore Security Rules** (test mode):
   ```
   match /snags/{document=**} {
     allow read, write: if true;
   }
   match /attachments/{document=**} {
     allow read, write: if true;
   }
   ```

## Common Development Tasks

### Adding a New Snag
1. User submits form in `SnagForm.jsx`
2. `addSnag()` from `useSnags()` is called
3. Attachments compressed & uploaded to Cloud Storage at `attachments/{snagId}/{fileId}`
4. Snag document created in Firestore collection "snags"
5. Real-time listener auto-updates UI

### Cycling Snag Status
- `cycleStatus(snagId)` rotates: `open` → `in-progress` → `closed` → `open`
- Updates Firestore document via `updateDoc()`

### Handling Errors
- Firestore errors caught in `onSnapshot` and stored in `error` state
- Display error UI in [../snag-app/src/App.jsx](../snag-app/src/App.jsx#L22-L32)
- Check Firebase config and Firestore rules first

## Localization & Styling
- **UI Language**: Arabic (RTL) with inline CSS objects
- **Font**: IBM Plex Sans Arabic (loaded in HTML)
- **Direction**: All flex containers use flexbox for RTL compatibility
- **Dark Theme**: Background `#060d1a`, text `#e2e8f0`, accent `#06b6d4`

## Debugging Tips
- Check `useSnags()` loading/error states before rendering data
- Verify Firebase config via browser console: `window.db`, `window.storage`
- Firestore emulator can be enabled for local development
- Attachment compression is client-side; check DevTools Network tab for Storage uploads

