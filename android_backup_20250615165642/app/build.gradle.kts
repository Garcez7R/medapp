apply(plugin = "com.android.application")
apply(plugin = "org.jetbrains.kotlin.android")

android {
    compileSdk = 33

    defaultConfig {
        applicationId = "com.example.medapp"
        minSdk = 21
        targetSdk = 33
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.8.10")
}
