import 'package:flutter/material.dart';

class MedicationsPage extends StatelessWidget {
  const MedicationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Medicamentos'),
      ),
      body: const Center(
        child: Text('Aqui você poderá gerenciar seus medicamentos.'),
      ),
    );
  }
}
