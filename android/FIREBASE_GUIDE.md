# Firebase Android Implementation Guide

To ensure real-time synchronization between your Android app and the Firestore database, use the following patterns in your Kotlin code.

## 1. Initialize Firestore
```kotlin
val db = Firebase.firestore
```

## 2. Write Data
This adds a new item to the `products` collection.
```kotlin
val product = hashMapOf(
    "name" to "Glutathione Cleanser",
    "quantity" to 10,
    "price" to 35000
)

db.collection("products")
    .add(product)
    .addOnSuccessListener { documentReference ->
        Log.d(TAG, "DocumentSnapshot added with ID: ${documentReference.id}")
    }
    .addOnFailureListener { e ->
        Log.w(TAG, "Error adding document", e)
    }
```

## 3. Listen for Changes (Real-time Sync)
This ensures that when an item is added from another device (like the web app), it appears instantly on the Android app.
```kotlin
db.collection("products")
    .addSnapshotListener { snapshots, e ->
        if (e != null) {
            Log.w(TAG, "Listen failed.", e)
            return@addSnapshotListener
        }

        for (doc in snapshots!!) {
            val name = doc.getString("name")
            val quantity = doc.getLong("quantity")
            // Update your UI here
        }
    }
```

## 4. Web vs Android
Your web app in AI Studio is already configured with these same patterns in `src/App.tsx`, ensuring seamless cross-platform syncing.
