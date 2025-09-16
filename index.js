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
  password: process.env.MYSQLPASSWORD,
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

app.post("/salvar-treinamento", (req, res) => {
  const { 
    id_empresa, 
    titulo, 
    descricao, 
    video_url, 
    conteudo_json, 
    data_inicio, 
    data_encerramento, 
    id_departamento 
  } = req.body;

  console.log('Dados Recebidos para salvar treinamento:', {
    id_empresa,
    titulo,
    descricao,
    video_url,
    conteudo_json,
    data_inicio,
    data_encerramento,
    id_departamento
  });

  // Se o `conteudo_json` não for uma string (caso do modo manual), ele precisa ser stringificado
  const conteudoParaSalvar = typeof conteudo_json === 'string' ? conteudo_json : JSON.stringify(conteudo_json);

  const sqlTreinamento = `
    INSERT INTO treinamentos (id_empresa, titulo, descricao, video_url, conteudo_json, data_inicio, data_encerramento, id_departamento) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sqlTreinamento, [
    id_empresa, 
    titulo, 
    descricao, 
    video_url || null, // Garante que é null se não houver URL
    conteudoParaSalvar,
    data_inicio, 
    data_encerramento,
    id_departamento
  ], (err, result) => {
    if (err) {
      console.error('Erro ao inserir no banco de dados:', err);
      return res.status(500).json({ 
        sucesso: false, 
        mensagem: 'Erro ao salvar o treinamento no banco de dados.',
        detalhes: err.message
      });
    }

    const id_treinamento = result.insertId;

    // Agora que temos o ID do treinamento, vamos criar progresso para os funcionários do departamento
    const sqlFuncionarios = `
      SELECT id_funcionario 
      FROM funcionarios 
      WHERE id_departamento = ? and status = 1
    `;

    db.query(sqlFuncionarios, [id_departamento], (err, funcionarios) => {
      if (err) {
        console.error("Erro ao buscar funcionários:", err);
        return res.status(500).json({ 
          sucesso: false, 
          mensagem: "Erro ao buscar funcionários",
          detalhes: err.message 
        });
      }

      if (funcionarios.length === 0) {
        return res.status(201).json({ 
          sucesso: true, 
          mensagem: "Treinamento salvo, mas nenhum funcionário encontrado para o departamento.",
          id_treinamento 
        });
      }

      // Monta os valores para o insert (com data_inicio preenchido)
      const values = funcionarios.map(f => [id_treinamento, f.id_funcionario, 'pendente', new Date()]);

      const sqlInsert = `
        INSERT INTO progresso_funcionario (id_treinamento, id_funcionario, status, data_inicio)
        VALUES ?
      `;

      db.query(sqlInsert, [values], (err) => {
        if (err) {
          console.error("Erro ao criar progresso:", err);
          return res.status(500).json({ 
            sucesso: false, 
            mensagem: "Treinamento salvo, mas erro ao criar progresso.",
            detalhes: err.message 
          });
        }

        res.status(201).json({ 
          sucesso: true, 
          mensagem: `Treinamento salvo e progresso criado para ${funcionarios.length} funcionários.`,
          id_treinamento 
        });
      });
    });
  });
});




app.get("/treinamentos", async (req, res) => {
  console.log("chegou até o treinamentos");
  
  const idFuncionario = req.query.id_funcionario;
  console.log(idFuncionario);
  
  try {
    const sql =`SELECT t.*
FROM treinamentos t
JOIN departamentos d ON d.id = t.id_departamento
JOIN funcionarios f ON f.id_departamento = d.id
WHERE f.id_funcionario = ?;`;

    db.query(sql,[idFuncionario], (err, results) => {
      if (err) {
        console.error("Erro ao buscar treinamentos:", err);
        return res.status(500).json({ error: "Erro ao buscar treinamentos" });
      }

      console.log("Treinamentos encontrados:", results);
      res.json(results); // Envia os dados para o frontend
    });

  } catch (error) {
    console.error("Erro inesperado:", error);
    res.status(500).json({ error: "Erro inesperado no servidor" });
  }
});



app.get('/treinamento/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM treinamentos WHERE id_treinamento = ?';
  const [rows] = await db.promise().query(query, [id]);

  if (rows.length > 0) {
    const treinamento = rows[0];
    console.log(treinamento);
    
    // res.json(treinamento);
    return res.json({
      titulo: treinamento.titulo,
      descricao: treinamento.descricao,
      resumo: treinamento.conteudo_json.resumo,
      quiz: treinamento.conteudo_json.quiz,
      topicos: treinamento.conteudo_json.tópicos_principais,
      conteudo_json:treinamento.conteudo_json
    });
  } else {
    return res.status(404).send('Treinamento não encontrado');
  }
});

app.patch('/pagamento', (req, res) => {
  const { id_funcionario,  nova_pontuacao } = req.body;
  console.log(id_funcionario,  nova_pontuacao);

  const pontosCalculados = nova_pontuacao * 500;
  const sql = `
    UPDATE funcionarios
SET  pontos_carteira = pontos_carteira +?, total_pontos = total_pontos+?
WHERE id_funcionario = ? ;
  `;

  db.query(sql, [pontosCalculados,pontosCalculados, id_funcionario], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar pontuação' });
    if (result.affectedRows === 0) {
      console.warn("⚠ Nenhuma linha foi atualizada. Verifique id_funcionario e id_departamento.");
    } else {
      console.log("Pontuação atualizada com sucesso");
    }
    res.json({ message: 'Pontuação atualizada com sucesso' });
  });
});

app.post('/status', (req, res) => {
  const {id_treinamento , id_funcionario} = req.body;

  const sql = `
    SELECT * FROM progresso_funcionario
    WHERE id_treinamento = ? and id_funcionario=?
  `;

  db.query(sql, [id_treinamento,id_funcionario], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar status' });
    console.log("Verificando status do treinamento")
    if (result.length > 0) {
      console.log(result)
      res.json({ exists:true });
    }else{
      res.json({ exists:false });
    }
  });
});

app.post('/criar_progresso', (req, res) => {
  const {id_treinamento , id_funcionario} = req.body;
  console.log(id_treinamento,id_funcionario,"Criar Processo");
  
  const sql = `
    INSERT INTO progresso_funcionario(id_treinamento,id_funcionario,status)
    VALUES (?, ?,'em_andamento')
  `;

  db.query(sql, [id_treinamento,id_funcionario], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro ao tentar criar processo' });
    console.log("Processo Criado")
    res.json({ mensagem:"progresso criado"});
  });
});
app.post('/criar_progresso_geral', (req, res) => {
  const { id_departamento, id_treinamento } = req.body;
  console.log(id_departamento, "Criar progresso geral");

  // 1. Buscar todos os funcionários do departamento
  const sqlFuncionarios = `
    SELECT id_funcionario 
    FROM funcionarios 
    WHERE id_departamento = ?
  `;

  db.query(sqlFuncionarios, [id_departamento], (err, funcionarios) => {
    if (err) {
      console.error("Erro ao buscar funcionários:", err);
      return res.status(500).json({ error: "Erro ao buscar funcionários" });
    }

    if (funcionarios.length === 0) {
      return res.status(404).json({ mensagem: "Nenhum funcionário encontrado para este departamento" });
    }

    // 2. Montar os valores para inserir em progresso_funcionario
    const values = funcionarios.map(f => [id_treinamento, f.id_funcionario, 'em_andamento']);

    const sqlInsert = `
      INSERT INTO progresso_funcionario (id_treinamento, id_funcionario, status)
      VALUES ?
    `;

    // 3. Executar inserção em massa
    db.query(sqlInsert, [values], (err, result) => {
      if (err) {
        console.error("Erro ao criar progresso:", err);
        return res.status(500).json({ error: "Erro ao criar progresso" });
      }

      console.log("Progresso criado para", funcionarios.length, "funcionários");
      res.json({ mensagem: `Progresso criado para ${funcionarios.length} funcionários` });
    });
  });
});

app.patch('/finalizar_progresso', upload.single('certificado'), (req, res) => {
  const { nova_pontuacao, id_treinamento, id_funcionario } = req.body;
  const certificado = req.file; // multer salva o arquivo e disponibiliza aqui

  if (!certificado) {
    return res.status(400).json({ error: "Certificado não enviado" });
  }

  // URL do certificado (relativa)
  const certificado_url = `/uploads/${certificado.filename}`;

  const sql = `
    UPDATE progresso_funcionario
    SET status='concluido', pontuacao_final=?, certificado_url=?
    WHERE id_treinamento=? AND id_funcionario=?
  `;

  db.query(sql, [nova_pontuacao, certificado_url, id_treinamento, id_funcionario], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro ao finalizar progresso' });

    console.log("Processo finalizado com certificado");
    res.json({ mensagem: "Progresso finalizado", certificado_url });
  });
});

app.get("/api/estatisticas", async (req, res) => {
  const idEmpresa = req.query.id_empresa;
  console.log(idEmpresa);
  
  if (!idEmpresa) {
    return res.status(400).json({ erro: "id_empresa é obrigatório" });
  }

  try {
    // Treinamentos da empresa
    const [treinamentos] = await db.promise().query(
      "SELECT * FROM treinamentos WHERE id_empresa = ?",
      [idEmpresa]
    );

    // Total de funcionários da empresa com progresso em treinamentos
    const [funcionarios] = await db.promise().query(
      `SELECT COUNT(DISTINCT pf.id_funcionario) AS total
       FROM progresso_funcionario pf
       INNER JOIN treinamentos t ON t.id_treinamento = pf.id_treinamento
       WHERE t.id_empresa = ?`,
      [idEmpresa]
    );

    const totalFuncionarios = funcionarios[0].total;
    let totalPontos = 0;
    let totalConclusaoPercentual = 0;
    const treinamentosResumo = [];

    for (const t of treinamentos) {
      const [progresso] = await db.promise().query(
        "SELECT status, pontuacao_final FROM progresso_funcionario WHERE id_treinamento = ?",
        [t.id_treinamento]
      );

      const participantes = progresso.length;
      const concluidos = progresso.filter(p => p.status === 'concluido').length;
      const totalPontuacao = progresso.reduce((acc, p) => acc + (p.pontuacao_final || 0), 0);
      const mediaPontuacao = participantes > 0 ? Math.round(totalPontuacao / participantes) : 0;
      const percentualConclusao = participantes > 0 ? Math.round((concluidos / participantes) * 100) : 0;

      totalPontos += totalPontuacao;
      totalConclusaoPercentual += percentualConclusao;

      treinamentosResumo.push({
        titulo: t.titulo,
        participantes,
        concluidos,
        media_pontuacao: mediaPontuacao,
        conclusao: percentualConclusao
      });
    }

    const mediaConclusao = treinamentos.length > 0 ? Math.round(totalConclusaoPercentual / treinamentos.length) : 0;

    res.json({
      totalFuncionarios,
      totalTreinamentos: treinamentos.length,
      totalPontos,
      mediaConclusao,
      treinamentos: treinamentosResumo
    });

  } catch (err) {
    console.error("Erro:", err);
    res.status(500).send("Erro ao gerar estatísticas");
  }
});


app.get("/ranking", (req, res) => {
  const id_empresa = Number(req.query.id_empresa);
  if (!id_empresa) return res.status(400).json({ error: "id_empresa é obrigatório e deve ser numérico" });

  const sql = `
    SELECT f.nome, f.total_pontos
    FROM funcionarios f
    JOIN departamentos d ON f.id_departamento = d.id
    WHERE d.id_empresa = ? AND Status = 1
    ORDER BY f.total_pontos DESC
    LIMIT 5;
  `;

  db.query(sql, [id_empresa], (err, results) => {
    if (err) {
      console.error("Erro ao buscar ranking:", err);
      return res.status(500).json({ error: "Erro ao buscar ranking" });
    }

    // Se não houver funcionários, retorna array vazio
    if (results.length === 0) {
      return res.json([]);
    }

    res.json(results); // results já é um array de objetos {nome, total_pontos}
  });
});



// Rotas para mercado de pontos - funcionario
// Buscar pontos do funcionário
app.get("/pontos", async (req, res) => {
  try {
    const id_funcionario = Number(req.query.id_funcionario); // garante número
    if (!id_funcionario) {
      return res.status(400).json({ error: "id_funcionario é obrigatório" });
    }

    
    const sql = 'SELECT pontos_carteira AS pontos FROM funcionarios WHERE id_funcionario = ?';
    db.query(sql, [id_funcionario], (err, result) => {
      if (err) {
        console.error("Erro ao buscar pontos:", err);
        return res.status(500).json({ error: "Erro ao puxar quantidade de pontos" });
      }

      if (result.length > 0) {
        return res.json({pontos: result[0].pontos});
      } else {
        return res.json({ pontos: 0 }); // se não achar o funcionário, retorna 0
      }
    });

  } catch (err) {
    console.error("Erro inesperado:", err);
    res.status(500).json({ error: "Erro inesperado" });
  }
});



//   const [rows] = await db.execute(
//     "SELECT pontos_carteira as pontos FROM funcionarios WHERE id_funcionario = ?",
//     [id_funcionario]
//   );
//   res.json(rows[0] || { pontos: 0 });
// });



// Resgatar recompensa
app.post("/resgatar", (req, res) => {
  const { id_funcionario, id_recompensa } = req.body;

  if (!id_funcionario || !id_recompensa) {
    return res.status(400).json({ error: "id_funcionario e id_recompensa são obrigatórios" });
  }

  // 1️⃣ Buscar recompensa
  const sqlRecompensa = "SELECT preco_pontos, id_empresa FROM recompensas WHERE id_recompensa = ?";
  db.query(sqlRecompensa, [id_recompensa], (err, recompensaResults) => {
    if (err) {
      console.error("Erro ao buscar recompensa:", err);
      return res.status(500).json({ error: "Erro ao buscar recompensa" });
    }

    if (recompensaResults.length === 0) {
      return res.status(404).json({ error: "Recompensa não encontrada" });
    }

    const recompensa = recompensaResults[0];

    // 2️⃣ Buscar funcionário e empresa via departamento
    const sqlFuncionario = `
      SELECT f.pontos_carteira, d.id_empresa
      FROM funcionarios f
      JOIN departamentos d ON f.id_departamento = d.id
      WHERE f.id_Funcionario = ?
    `;
    db.query(sqlFuncionario, [id_funcionario], (err, funcResults) => {
      if (err) {
        console.error("Erro ao buscar funcionário:", err);
        return res.status(500).json({ error: "Erro ao buscar funcionário" });
      }

      if (funcResults.length === 0) {
        return res.status(404).json({ error: "Funcionário não encontrado" });
      }

      const func = funcResults[0];

      // 3️⃣ Validar pontos e empresa
      if (func.pontos_carteira < recompensa.preco_pontos) {
        return res.status(400).json({ error: "Pontos insuficientes" });
      }

      if (func.id_empresa !== recompensa.id_empresa) {
        return res.status(400).json({ error: "Recompensa não pertence à empresa do funcionário" });
      }

      // 4️⃣ Deduzir pontos
      const sqlUpdate = "UPDATE funcionarios SET pontos_carteira = pontos_carteira - ? WHERE id_Funcionario = ?";
      db.query(sqlUpdate, [recompensa.preco_pontos, id_funcionario], (err) => {
        if (err) {
          console.error("Erro ao deduzir pontos:", err);
          return res.status(500).json({ error: "Erro ao atualizar pontos" });
        }

        // 5️⃣ Registrar resgate
        const sqlInsert = "INSERT INTO recompensas_resgatadas (id_funcionario, id_recompensa) VALUES (?, ?)";
        db.query(sqlInsert, [id_funcionario, id_recompensa], (err) => {
          if (err) {
            console.error("Erro ao registrar resgate:", err);
            return res.status(500).json({ error: "Erro ao registrar resgate" });
          }

          // Tudo ok
          return res.sendStatus(200);
        });
      });
    });
  });
});

app.post("/criar-recompensas", async (req, res) => {
  const { nome, descricao, preco_pontos,id_empresa, quantidade} = req.body;
  console.log(nome, descricao, preco_pontos,id_empresa, quantidade);
  
  if (!nome || !descricao || !preco_pontos || preco_pontos < 1) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  try {
    await db.execute(
      "INSERT INTO recompensas (nome, descricao, preco_pontos,id_empresa, quantidade_disponivel) VALUES (?, ?, ?,?,?)",
      [nome, descricao, preco_pontos,id_empresa, quantidade]
    );
    res.sendStatus(201);
  } catch (err) {
    console.error("Erro ao inserir recompensa:", err);
    res.status(500).json({ error: "Erro interno." });
  }
});
app.get("/recompensas", async (req, res) => {
  const id_empresa = req.query.id_empresa;
  const id_funcionario = req.query.id_funcionario;
  console.log("id_empresa recebido:", id_empresa); 
  if (id_empresa){
    try {
      const [recompensas] = await db.promise().execute("SELECT * FROM recompensas WHERE id_empresa = ?", [id_empresa]);
      res.status(200).json(recompensas);
    } catch (error) {
      console.error("Erro ao buscar recompensas:", error);
      res.status(500).json({ error: "Erro ao buscar recompensas." });
    }
  } else{
    try {
      const [recompensas] = await db.promise().execute(`SELECT r.* FROM recompensas r JOIN departamentos d ON r.id_empresa = d.id_empresa JOIN funcionarios f ON f.id_departamento = d.id WHERE f.id_Funcionario = ?;`, [id_funcionario]);
      res.status(200).json(recompensas);
    } catch (error) {
      console.error("Erro ao buscar recompensas:", error);
      res.status(500).json({ error: "Erro ao buscar recompensas." });
    }
  }
  
});

app.put("/recompensas/:id", async (req, res) => {
  const { nome, descricao, preco_pontos,id_empresa, quantidade_disponivel } = req.body;
  const id = req.params.id;

  if (!id || !nome || !descricao || !preco_pontos || !id_empresa || !quantidade_disponivel) {
    return res.status(400).json({ error: "Dados inválidos." });
  }

  try {
    await db.execute(
      "UPDATE recompensas SET nome = ?, descricao = ?, preco_pontos = ?, quantidade_disponivel=? WHERE id_recompensa = ?",
      [nome, descricao, preco_pontos, quantidade_disponivel, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro ao atualizar recompensa:", err);
    res.status(500).json({ error: "Erro ao atualizar." });
  }
});

// Deletar recompensa (DELETE)
app.delete("/recompensas/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await db.execute("DELETE FROM recompensas WHERE id_recompensa = ?", [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro ao deletar recompensa:", err);
    res.status(500).json({ error: "Erro ao deletar." });
  }
});


app.get("/treinamentos_empresa", async (req, res) => {
  console.log("chegou até o treinamentos");
  
  const id_empresa = req.query.id_empresa;
  console.log(id_empresa);
  
  try {
    const sql =`SELECT t.*
FROM treinamentos t
WHERE t.id_empresa = ?`;

    db.query(sql,[id_empresa], (err, results) => {
      if (err) {
        console.error("Erro ao buscar treinamentos:", err);
        return res.status(500).json({ error: "Erro ao buscar treinamentos" });
      }

      console.log("Treinamentos encontrados:", results);
      res.json(results); // Envia os dados para o frontend
    });

  } catch (error) {
    console.error("Erro inesperado:", error);
    res.status(500).json({ error: "Erro inesperado no servidor" });
  }
});

app.post('/removerTreinamento', (req, res) => {
  console.error("dentro do remover");
    const {id} = req.body;
    console.log(id);
  const sql = 'DELETE FROM treinamentos WHERE id_treinamento = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      console.error(id)
      return res.status(500).send("Erro ao deletar");
    }

    if (result.affectedRows === 0) {
      console.error(id)
      return res.status(404).send("Nenhum funcionario deletado. ID não encontrado?");
    }

    res.send("Funcionario deletado com sucesso");
  });
});

app.get('/list_edit_treinamento/:id', (req, res) => {
  const { id } = req.params;
  console.log("Buscando treinamento ID:", id);

  const sql = 'SELECT * FROM treinamentos WHERE id_treinamento = ?';
  db.query(sql, [id], (err, result) => {
      if (err) {
          console.error("Erro SQL:", err);
          return res.status(500).json({ error: "Erro ao buscar treinamento" });
      }

      if (result.length === 0) {
          return res.status(404).json({ error: "Treinamento não encontrado" });
      }

      // Se conteudo_json for string → parseia
      if (typeof result[0].conteudo_json === "string") {
          try {
              result[0].conteudo_json = JSON.parse(result[0].conteudo_json);
          } catch (e) {
              console.warn("Falha ao parsear conteudo_json:", e);
          }
      }

      res.json(result); // devolve array JSON
  });
});

app.put('/update_treinamento/:id', (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, conteudo_json } = req.body;

  const sql = `
      UPDATE treinamentos 
      SET titulo = ?, descricao = ?, conteudo_json = ?
      WHERE id_treinamento = ?
  `;

  db.query(sql, [titulo, descricao, JSON.stringify(conteudo_json), id], (err, result) => {
      if (err) {
          console.error("Erro ao atualizar treinamento:", err);
          return res.status(500).json({ error: "Erro ao atualizar treinamento" });
      }

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Treinamento não encontrado" });
      }

      res.json({ success: true, message: "Treinamento atualizado com sucesso" });
  });
});

app.get('/fill_profile', (req, res) => {
  const { id, tipo } = req.query;
  if (tipo === 'funcionario') {
    sql = `
      SELECT f.nome, e.nome_fantasia AS empresa, f.email AS email , d.nome AS funcao
FROM funcionarios f
INNER JOIN departamentos d ON f.id_departamento = d.id
INNER JOIN empresas e ON d.id_empresa = e.id_empresa
WHERE f.id_funcionario = ?;
    `;
  } else if (tipo === 'empresa') {
    sql = `
      SELECT * FROM empresas WHERE id_empresa = ?;
    `;
  } else {
    return res.status(400).json({ error: "Tipo de usuário inválido." });
  }
  

  db.query(sql, [id], (err, result) => {
      if (err) {
          console.error("Erro ao achar usuário:", err);
          return res.status(500).json({ error: "Erro ao achar usuário" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Nenhum treinamento encontrado" });
    }
      user = result[0]
      console.log(user);
      res.json(user);
  });
});

app.get('/courses', (req, res) => {
  const { id, tipo } = req.query;
  if (tipo === 'funcionario') {
    sql = `
      SELECT 
t.id_treinamento AS id,
t.titulo AS titulo,
t.descricao,
p.id_progresso AS progresso,
p.status AS status
FROM treinamentos t
INNER JOIN progresso_funcionario p ON t.id_treinamento = p.id_treinamento
WHERE p.id_funcionario = ?;
    `;
  } else if (tipo === 'empresa') {
    sql = `
      SELECT * FROM empresa WHERE id_empresa = ?;
    `;
  } else {
    return res.status(400).json({ error: "Tipo de usuário inválido." });
  }
  

  db.query(sql, [id], (err, result) => {
      if (err) {
          console.error("Erro ao achar treinamentos:", err);
          return res.status(500).json({ error: "Erro ao achar treimamentos" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Nenhum treinamento encontrado" });
    }
      console.log(result);
      res.json(result);
  });
});

app.get('/courses_statistics', (req, res) => {
  const { id, tipo } = req.query;
  if (tipo === 'funcionario') {
    sql = `
    SELECT
    f.total_pontos AS pontos,
    COUNT(CASE WHEN p.status = 'concluído' THEN 1 ELSE NULL END) AS cursos_concluidos,
    COUNT(p.certificado_url) AS certificados_obtidos
    FROM
    funcionarios f
    INNER JOIN
    progresso_funcionario p ON p.id_funcionario = f.id_Funcionario
    WHERE
    f.id_Funcionario = ?
    GROUP BY
    f.id_Funcionario;
    `;
  } else if (tipo === 'empresa') {
    sql = `
      SELECT * FROM empresa WHERE id_empresa = ?;
    `;
  } else {
    return res.status(400).json({ error: "Tipo de usuário inválido." });
  }
  

  db.query(sql, [id], (err, result) => {
      if (err) {
          console.error("Erro ao achar treinamentos:", err);
          return res.status(500).json({ error: "Erro ao achar treimamentos" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Nenhum treinamento encontrado" });
    }
      
      res.json(result[0]);
  });
});



app.get('/empresa_data', (req, res) => {
  const {id} = req.query;
  console.log(id)
    sql = `
      SELECT nome_fantasia as nome FROM empresas WHERE id_empresa = ?;
    `;

  db.query(sql, [id], (err, result) => {
      if (err) {
          console.error("Erro ao achar treinamentos:", err);
          return res.status(500).json({ error: "Erro ao achar empresa" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Nenhum empresa encontrado" });
    }
      
      res.json(result[0]);
  });
});

app.get("/fill_dashboard_empresa", (req, res) => {
  const { id } = req.query;

  const sql = `
    SELECT
  /* Funcionários Ativos */
  (SELECT COUNT(*)
     FROM funcionarios f
     JOIN departamentos d ON f.id_departamento = d.id
    WHERE d.id_empresa = e.id_empresa and status = 1
  ) AS funcionarios_ativos,

  /* Treinamentos Ativos */
  (SELECT COUNT(*)
     FROM treinamentos t
    WHERE t.id_empresa = e.id_empresa
      AND (t.data_inicio IS NULL OR t.data_inicio <= NOW())
      AND (t.data_encerramento IS NULL OR t.data_encerramento > NOW())
  ) AS treinamentos_ativos,

  /* Certificados Emitidos */
  (SELECT COUNT(*)
     FROM progresso_funcionario pf
     JOIN funcionarios f2  ON pf.id_funcionario = f2.id_Funcionario
     JOIN departamentos d2 ON f2.id_departamento = d2.id
     JOIN treinamentos t2  ON pf.id_treinamento = t2.id_treinamento
    WHERE d2.id_empresa = e.id_empresa
      AND t2.id_empresa = e.id_empresa
      AND pf.status = 'concluido'
      AND pf.certificado_url IS NOT NULL
  ) AS certificados_emitidos,

  /* Taxa de Conclusão */
  (SELECT ROUND(
            100 * IFNULL(
              SUM(CASE WHEN pf.status = 'concluido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)
            , 0), 2)
     FROM progresso_funcionario pf
     JOIN funcionarios f3  ON pf.id_funcionario = f3.id_Funcionario
     JOIN departamentos d3 ON f3.id_departamento = d3.id
     JOIN treinamentos t3  ON pf.id_treinamento = t3.id_treinamento
    WHERE d3.id_empresa = e.id_empresa
      AND t3.id_empresa = e.id_empresa
  ) AS taxa_conclusao

FROM empresas e
WHERE e.id_empresa = ?;
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.json({
        funcionarios_ativos: 0,
        treinamentos_ativos: 0,
        certificados_emitidos: 0,
        taxa_conclusao: 0
      });
    }
  });
});

app.get("/count_training", (req, res) => {
  const { id } = req.query;
 
  const sql = `
    SELECT COUNT(*) AS treinamentos FROM treinamentos WHERE id_empresa = ?;
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (result.length > 0) {
      res.json(result[0]);
    } 
  });
});



app.get("/certificados/:id_funcionario", async (req, res) => {
  const { id_funcionario } = req.params;
  try {
    const [rows] = await db.promise().query(
      `
      SELECT 
        t.titulo AS nome_treinamento,
        p.certificado_url,
        p.id_treinamento
      FROM progresso_funcionario p
      JOIN treinamentos t ON p.id_treinamento = t.id_treinamento
      WHERE p.id_funcionario = ? AND p.status = 'concluido'
      `,
      [id_funcionario]
    );

    if (rows.length === 0) {
      return res.json([]);
    }

    // Agora apenas retornamos a URL do certificado
    const certificados = rows.map(r => ({
      nomeTreinamento: r.nome_treinamento,
      idTreinamento: r.id_treinamento,
      imagem: r.certificado_url // URL relativa, ex: "/uploads/1694400000000.png"
    }));

    res.json(certificados);
  } catch (error) {
    console.error("Erro ao buscar certificados:", error);
    res.status(500).send("Erro interno");
  }
});


app.get("/fill_dashboard_funcionario", (req, res) => {
  const { id } = req.query;
 
  const sql = `
    SELECT 
    f.id_Funcionario AS id_funcionario,

    -- Quantidade de treinamentos concluídos
    COUNT(CASE WHEN p.status = 'concluido' THEN 1 END) AS treinamentos_concluidos,

    -- Quantidade de certificados emitidos (certificado_url não nulo)
    COUNT(CASE WHEN p.certificado_url IS NOT NULL AND p.certificado_url <> '' THEN 1 END) AS certificados_emitidos,

    -- Pontos acumulados (soma das pontuações finais)
    COALESCE(SUM(p.pontuacao_final), 0) AS pontos_acumulados,

    -- Taxa de conclusão (%)
    ROUND(
        (COUNT(CASE WHEN p.status = 'concluido' THEN 1 END) / 
         NULLIF(COUNT(p.id_treinamento), 0)) * 100, 2
    ) AS taxa_conclusao_percentual

FROM funcionarios f
LEFT JOIN progresso_funcionario p 
    ON f.id_Funcionario = p.id_funcionario
WHERE f.id_Funcionario = ?
GROUP BY f.id_Funcionario;
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (result.length > 0) {
      res.json(result[0]);
    } 
  });
});

app.get('/download/:filename', (req, res) => {
  const file = path.join(__dirname, 'uploads', req.params.filename);
  res.download(file); // força o download
});


// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
});
