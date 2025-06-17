import 'package:flutter/material.dart';
import 'package:medapp/modules/medications_manager/views/medications_page.dart';

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
      home: MedicationsPage(), // 🔹 const removido aqui
    );
  }
}
