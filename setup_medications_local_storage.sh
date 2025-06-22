#!/bin/bash

echo "🔧 [1/5] Adicionando dependência shared_preferences..."
flutter pub add shared_preferences

echo "📁 [2/5] Criando model Medication..."
cat > lib/models/medication.dart << 'EOF'
class Medication {
  final String nome;
  final String horario;

  Medication({required this.nome, required this.horario});

  Map<String, dynamic> toJson() => {
    'nome': nome,
    'horario': horario,
  };

  factory Medication.fromJson(Map<String, dynamic> json) {
    return Medication(
      nome: json['nome'],
      horario: json['horario'],
    );
  }
}
EOF

echo "📝 [3/5] Atualizando formulário para usar TimePicker e salvar localmente..."
cat > lib/modules/medications_manager/views/medications_page.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../../../models/medication.dart';

class MedicationsPage extends StatefulWidget {
  const MedicationsPage({Key? key}) : super(key: key);

  @override
  State<MedicationsPage> createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  final List<Medication> _medications = [];
  final _formKey = GlobalKey<FormState>();
  final _nomeController = TextEditingController();
  TimeOfDay? _selectedTime;

  @override
  void initState() {
    super.initState();
    _loadMedications();
  }

  Future<void> _loadMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getStringList('medications') ?? [];
    setState(() {
      _medications.addAll(data.map((e) => Medication.fromJson(json.decode(e))));
    });
  }

  Future<void> _saveMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = _medications.map((e) => json.encode(e.toJson())).toList();
    await prefs.setStringList('medications', data);
  }

  void _addMedication() async {
    if (_formKey.currentState!.validate() && _selectedTime != null) {
      final horarioFormatado =
          '${_selectedTime!.hour.toString().padLeft(2, '0')}:${_selectedTime!.minute.toString().padLeft(2, '0')}';

      final newMed = Medication(
        nome: _nomeController.text,
        horario: horarioFormatado,
      );

      setState(() {
        _medications.add(newMed);
      });

      await _saveMedications();

      _nomeController.clear();
      _selectedTime = null;
      Navigator.of(context).pop();
    }
  }

  void _openAddDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Novo Medicamento'),
        content: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nomeController,
                decoration: const InputDecoration(labelText: 'Nome'),
                validator: (value) =>
                    value!.isEmpty ? 'Informe o nome do medicamento' : null,
              ),
              const SizedBox(height: 8),
              ElevatedButton.icon(
                icon: const Icon(Icons.access_time),
                label: Text(_selectedTime == null
                    ? 'Selecionar Horário'
                    : '${_selectedTime!.format(context)}'),
                onPressed: () async {
                  final picked = await showTimePicker(
                    context: context,
                    initialTime: TimeOfDay.now(),
                  );
                  if (picked != null) {
                    setState(() {
                      _selectedTime = picked;
                    });
                  }
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          ElevatedButton(onPressed: _addMedication, child: const Text('Salvar')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meus Medicamentos')),
      body: ListView.builder(
        itemCount: _medications.length,
        itemBuilder: (_, index) {
          final med = _medications[index];
          return ListTile(
            leading: const Icon(Icons.medication),
            title: Text(med.nome),
            subtitle: Text('Horário: ${med.horario}'),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openAddDialog,
        child: const Icon(Icons.add),
      ),
    );
  }
}
EOF

echo "✅ [4/5] Atualizações aplicadas com sucesso."

echo "📌 [5/5] Próximo passo: execute 'flutter run' e cadastre medicamentos!"
