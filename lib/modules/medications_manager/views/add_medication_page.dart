import 'package:flutter/material.dart';

class AddMedicationPage extends StatefulWidget {
  const AddMedicationPage({super.key});

  @override
  State<AddMedicationPage> createState() => _AddMedicationPageState();
}

class _AddMedicationPageState extends State<AddMedicationPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _dosageController = TextEditingController();
  final _timeController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _dosageController.dispose();
    _timeController.dispose();
    super.dispose();
  }

  void _saveMedication() {
    if (_formKey.currentState!.validate()) {
      final name = _nameController.text.trim();
      final dosage = _dosageController.text.trim();
      final time = _timeController.text.trim();

      // 📝 Aqui futuramente salvaremos no armazenamento
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Medicamento "$name" salvo (ainda sem persistência).')),
      );

      Navigator.pop(context); // Volta para a tela anterior
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Adicionar Medicamento'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nome do Medicamento',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Informe o nome do medicamento'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _dosageController,
                decoration: const InputDecoration(
                  labelText: 'Dosagem (ex: 500mg)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _timeController,
                decoration: const InputDecoration(
                  labelText: 'Horário (ex: 08:00)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _saveMedication,
                icon: const Icon(Icons.save),
                label: const Text('Salvar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
