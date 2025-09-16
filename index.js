const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs'); 
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Usar PORT em vez de MYSQLPORT para o Railway
const port = process.env.PORT || 3000;

const app = express();

const cors = require('cors');

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Conexão com o banco
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD, // Corrigido: removido aspas extras
  database: process.env.MYSQLDB
});

db.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
    return;
  }
  console.log('Conectado ao banco de dados traineasy');
});

// Configurando onde salvar o vídeo
const storage = multer.diskStorage({
  destination: 'uploads/', // cria essa pasta se ainda não existir
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // nome único
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota para servir o index.html principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rota POST - adiciona uma nova empresa
app.post('/empresas', (req, res) => {
  const { razao_social, nome_fantasia, email, cnpj, senha  } = req.body;
  console.log('Dados recebidos:', {razao_social, nome_fantasia, email, cnpj, senha  });

  // Verificando se todos os campos necessários foram preenchidos
  if (!razao_social|| !nome_fantasia|| !email|| !cnpj|| !senha  ) {
    return res.status(400).send('Todos os campos são obrigatórios.');
  }

  // Criptografando a senha
  bcrypt.hash(senha, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Erro ao criptografar a senha:', err);
      return res.status(500).send('Erro ao processar a senha.');
    }

    // Inserindo os dados no banco de dados
    const sql = 'INSERT INTO empresas (razao_social, nome_fantasia, email, cnpj, senha, status ) VALUES (?, ?, ?, ?, ?, 3)';
    db.query(sql, [razao_social, nome_fantasia, email, cnpj, hashedPassword  ], (err, result) => {
      if (err) {
        console.error('Erro ao cadastrar empresa:', err);
        return res.status(500).json({ erro: err });
      }
      res.send('Empresa cadastrada com sucesso!');
    });
  });
});

//Adicionando um novo funcionario
app.post('/funcionarios', (req, res) => {
  const { email, senha, id_departamento, nome} = req.body;
  console.log('Dados recebidos:', {email, senha, id_departamento});

  // Verificando se todos os campos necessários foram preenchidos
  if (!email||!senha||!id_departamento) {
    return res.status(400).send('Todos os campos são obrigatórios.');
  }

  //Criptografando a senha
  bcrypt.hash(senha, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Erro ao criptografar a senha:', err);
      return res.status(500).send('Erro ao processar a senha.');
    }

    // Inserindo os dados no banco de dados
    const sql = 'INSERT INTO funcionarios (email, senha, id_departamento, nome, status ) VALUES (?, ?, ?, ?, 1)';
    db.query(sql, [email, hashedPassword, id_departamento, nome], (err, result) => {
      if (err) {
        console.error('Erro ao cadastrar funcionario:', err);
        return res.status(500).json({ erro: err });
      }
      res.send('Funcionario cadastrado com sucesso!');
    });
  });
});

// Rota POST - adiciona uma novo deparamento
app.post('/departamentos', (req, res) => {
  const { id_empresa, nome, descritivo} = req.body;
  console.log('Dados recebidos:', {id_empresa, nome, descritivo});

  // Verificando se todos os campos necessários foram preenchidos
  if (!id_empresa|| !nome|| !descritivo) {
    return res.status(400).send('Todos os campos são obrigatórios.');
  }

  // Inserindo os dados no banco de dados
  const sql = 'INSERT INTO departamentos (id_empresa, nome, descritivo) VALUES (?, ?, ?)';
  db.query(sql, [id_empresa, nome, descritivo], (err, result) => {
    if (err) {
      console.error('Erro ao cadastrar departamento:', err);
      return res.status(500).json({ erro: err });
    }
    res.send('Departamento cadastrado com sucesso!');
  });
});

// list empresas - CORRIGIDO para evitar SQL injection
app.post('/list_empresas', (req, res) => {
  console.log('dentro de list_empresas');

  const { nome, status } = req.body;
  console.log(nome, status);

  let sql = 'SELECT * FROM empresas';
  let params = [];

  if (nome && status) {
    sql += ' WHERE (nome_fantasia LIKE ? OR razao_social LIKE ?) AND status = ?';
    params = [`%${nome}%`, `%${nome}%`, status];
  } else if (nome) {
    sql += ' WHERE nome_fantasia LIKE ? OR razao_social LIKE ?';
    params = [`%${nome}%`, `%${nome}%`];
  } else if (status) {
    sql += ' WHERE status = ?';
    params = [status];
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar empresas' });
    res.json(results);
  });
});

// atualizar empresa
app.post('/editarEmpresa', (req, res) => {
  const { id, razao_social, nome_fantasia, email, cnpj, status } = req.body;

  const sql = 'UPDATE empresas SET razao_social = ?, nome_fantasia = ?, email = ?, cnpj = ?, status = ? WHERE id_empresa = ?';
  db.query(sql, [razao_social, nome_fantasia, email, cnpj, status, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao atualizar");
    }
    res.send("Empresa atualizada com sucesso!");
  });
});

// list departamentos
app.post('/list_departamento', (req, res) => {
  const { id_empresa } = req.body;
  console.log('Dados recebidos:', {id_empresa});

  let sql = "SELECT * FROM departamentos";
  let params = [];

  if (id_empresa) {
    sql += " WHERE id_empresa = ?";
    params = [id_empresa];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Erro ao buscar departamentos:", err);
      return res.status(500).json({ error: "Erro ao buscar departamentos" });
    }
    console.log(results);
    res.json(results);
  });
});

// Rota para atualizar departamento
app.post('/editarDepartamento', (req, res) => {
  const { id, nome, descritivo } = req.body;
  console.log('Dados recebidos:', { id, nome, descritivo });
  
  const sql = 'UPDATE departamentos SET nome = ?, descritivo = ? WHERE id = ?';
  db.query(sql, [nome, descritivo, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao atualizar");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Nenhum departamento atualizado. ID não encontrado?");
    }

    res.send("Departamento atualizado com sucesso");
  });
});

//lista funcionarios - CORRIGIDO para evitar SQL injection
app.post('/list_funcionarios', (req, res) => {
  console.log('dentro de list_funcionarios');

  const { id } = req.body;

  let sql = 'SELECT * FROM funcionarios';
  let params = [];

  if (id) {
    sql += ' WHERE id_departamento = ? AND Status = 1';
    params = [id];
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar funcionarios' });
    console.log(results);
    res.json(results);
  });
});

// Rota para atualizar funcionario
app.post('/editarFuncionario', (req, res) => {
  console.log("dentro da edicao");
  const { id, nome, email } = req.body;
  console.log(`id: ${id}, nome: ${nome}, email: ${email}`);

  const sql = 'UPDATE funcionarios SET nome = ?, email = ? WHERE id_Funcionario = ?';
  db.query(sql, [nome, email, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao atualizar");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Nenhum funcionario atualizado. ID não encontrado?");
    }

    res.send("Funcionario atualizado com sucesso");
  });
});
 
// Deletar funcionarios
app.post('/deletarFuncionario', (req, res) => {
  console.log("dentro do delete");
  const {id} = req.body;
  
  const sql = 'UPDATE funcionarios SET Status = 2 WHERE id_Funcionario = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao deletar");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Nenhum funcionario deletado. ID não encontrado?");
    }

    res.send("Funcionario deletado com sucesso");
  });
});

// Rota POST - Verifica funcionário no banco de dados e da acesso
app.post('/login', (req, res) => {
  console.log('dentro de login');

  const { email, senha } = req.body;
  console.log(email, senha);

  if (!email || !senha) {
    return res.status(400).send('Email e senha são obrigatórios.');
  }

  // Primeiro tenta nos funcionários
  const sqlFuncionario = 'SELECT * FROM funcionarios WHERE email = ?';
  db.query(sqlFuncionario, [email], (err, results) => {
    if (err) {
      console.error('Erro ao buscar funcionário:', err);
      return res.status(500).send('Erro no servidor.');
    }

    if (results.length > 0) {
      const usuario = results[0];
      return bcrypt.compare(senha, usuario.senha, (err, isMatch) => {
        if (err) return res.status(500).send('Erro ao comparar senhas.');
        if (!isMatch) return res.status(401).send('Senha incorreta.');
        return res.json({ nome:usuario.nome, mensagem: `Bem-vindo, ${usuario.nome}!`, tipo: 'funcionario',id:usuario.id_Funcionario });
      });
    }

    // Se não achou funcionário, tenta nas empresas
    const sqlEmpresa = 'SELECT * FROM empresas WHERE email = ?';
    db.query(sqlEmpresa, [email], (err, results) => {
      if (err) {
        console.error('Erro ao buscar empresa:', err);
        return res.status(500).send('Erro no servidor.');
      }

      if (results.length === 0) {
        return res.status(401).send('Usuário não encontrado.');
      }

      const empresa = results[0];
      bcrypt.compare(senha, empresa.senha, (err, isMatch) => {
        if (err) return res.status(500).send('Erro ao comparar senhas.');
        if (!isMatch) return res.status(401).send('Senha incorreta.');
        return res.json({ usuario: empresa.nome_fantasia, tipo: 'empresa', id: empresa.id_empresa});
      });
    });
  });
});

// Resto do código permanece igual...
// [Incluir o restante das rotas do arquivo original]

// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
});
