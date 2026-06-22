# Firebase iOS Implementation Guide

To ensure real-time synchronization between your iOS app and the Firestore database, use the following Swift patterns.

## 1. Initialize Firebase
In your `AppDelegate.swift` or `App.swift` (SwiftUI):

```swift
import FirebaseCore

@main
struct EliteBeautyApp: App {
    init() {
        FirebaseApp.configure()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

## 2. Write Data
```swift
import FirebaseFirestore

let db = Firestore.firestore()

func addProduct() {
    db.collection("products").addDocument(data: [
        "name": "Glutathione Cleanser",
        "quantity": 10,
        "price": 35000,
        "createdBy": "iOS Device"
    ]) { err in
        if let err = err {
            print("Error adding document: \(err)")
        } else {
            print("Document added successfully")
        }
    }
}
```

## 3. Listen for Changes (Real-time Sync)
```swift
db.collection("products").addSnapshotListener { querySnapshot, error in
    guard let documents = querySnapshot?.documents else {
        print("Error fetching documents: \(error!)")
        return
    }
    
    let products = documents.map { $0.data() }
    // Update your UI with the new products list
}
```

## 4. Cross-Platform Consistency
The `bundle_id` is set to `com.elitebeuty.app` to match your Android configuration, ensuring all devices point to the same `elite-stock-tracker` project.
