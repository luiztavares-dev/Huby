import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function App() {
  const [usuario, setUsuario] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  
 
  const [mensagem, setMensagem] = useState<string>('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro' | ''>('');

  const IP_DO_COMPUTADOR: string = "localhost"; 

  const enviarParaOJava = async (acao: 'login' | 'registrar'): Promise<void> => {
    // Validação inicial
    if (!usuario || !senha) {
      mostrarNotificacao("Preencha todos os campos!", "erro");
      return;
    }

    try {
      const resposta = await fetch(`http://${IP_DO_COMPUTADOR}:8080/api/${acao}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: usuario, senha: senha })
      });

      const textoResultado: string = await resposta.text();
      
   
      if (textoResultado.includes("Erro")) {
        mostrarNotificacao(textoResultado, "erro");
      } else {
        mostrarNotificacao(textoResultado, "sucesso");
      }

    } catch (error) {
      console.log(error);
      mostrarNotificacao("O servidor Java está desligado ou inacessível.", "erro");
    }
  };

  
  const mostrarNotificacao = (texto: string, tipo: 'sucesso' | 'erro') => {
    setMensagem(texto);
    setTipoMensagem(tipo);
    
    setTimeout(() => {
      setMensagem('');
      setTipoMensagem('');
    }, 3000); 
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Acesso - Huby</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="Usuário" 
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Senha" 
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity style={[styles.botao, styles.btnLogin]} onPress={() => enviarParaOJava('login')}>
        <Text style={styles.txtBotao}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.botao, styles.btnReg]} onPress={() => enviarParaOJava('registrar')}>
        <Text style={styles.txtBotao}>Cadastrar Novo</Text>
      </TouchableOpacity>

    
      {mensagem !== '' && (
        <View style={[
          styles.caixaNotificacao, 
          tipoMensagem === 'sucesso' ? styles.notificacaoVerde : styles.notificacaoVermelha
        ]}>
          <Text style={styles.txtNotificacao}>{mensagem}</Text>
        </View>
      )}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  titulo: { fontSize: 26, fontWeight: 'bold', marginBottom: 25, color: '#333' },
  input: { width: '100%', height: 50, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ccc', fontSize: 16 },
  botao: { width: '100%', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginVertical: 6 },
  btnLogin: { backgroundColor: '#007bff' },
  btnReg: { backgroundColor: '#28a745' },
  txtBotao: { color: '#fff', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
  
  
  caixaNotificacao: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  notificacaoVerde: { backgroundColor: '#d4edda', borderColor: '#c3e6cb', borderWidth: 1 },
  notificacaoVermelha: { backgroundColor: '#f8d7da', borderColor: '#f5c6cb', borderWidth: 1 },
  txtNotificacao: { fontSize: 15, fontWeight: 'bold', color: '#333', textAlign: 'center' }
});