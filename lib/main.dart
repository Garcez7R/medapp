import 'package:flutter/material.dart';
import 'pages/medications_page.dart';
import 'pages/exams_consultations_page.dart';
import 'pages/health_data_page.dart';
import 'pages/about_page.dart';

void main() => runApp(MedApp());

class MedApp extends StatefulWidget {
  @override
  State<MedApp> createState() => _MedAppState();
}

class _MedAppState extends State<MedApp> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    MedicationsPage(),
    ExamsConsultationsPage(),
    HealthDataPage(),
    AboutPage(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MedApp',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: Text('MedApp'),
        ),
        body: _pages[_selectedIndex],
        bottomNavigationBar: BottomNavigationBar(
          type: BottomNavigationBarType.fixed,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.medication),
              label: 'Medicamentos',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.event_note),
              label: 'Exames',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.monitor_heart),
              label: 'Saúde',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.info_outline),
              label: 'Sobre',
            ),
          ],
          currentIndex: _selectedIndex,
          selectedItemColor: Colors.blueAccent,
          onTap: _onItemTapped,
        ),
      ),
    );
  }
}
