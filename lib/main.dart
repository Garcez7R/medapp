import 'package:flutter/material.dart';
import 'pages/medications_page.dart';
import 'medications_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MedApp',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MedicationsPage(),
    );
  }
}
