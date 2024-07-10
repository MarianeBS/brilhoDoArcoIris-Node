// Importe os módulos necessários
const express = require("express");
const bodyParser = require("body-parser");
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const exphbs = require("express-handlebars"); // Corrigido: Importe express-handlebars corretamente
const path = require('path');
const favicon = require('serve-favicon');

const serviceAccount = require('./brilho-do-arco-iris-firebase.json');

// Inicialização do Firebase
initializeApp({
    credential: cert(serviceAccount)
});
const db = getFirestore();

// Configurações do Express
const app = express();
app.engine("handlebars", exphbs.create({ defaultLayout: "main" }).engine); // Corrigido: Configuração correta do express-handlebars
app.set("view engine", "handlebars");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// Configuração do diretório de views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');

// Configuração do diretório de views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');

// Middleware para servir o favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Middleware para servir arquivos estáticos
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.static(path.join(__dirname, 'public'))); // Servir outros arquivos estáticos, se necessário


// Handlebars Helper - compare
exphbs.create({}).handlebars.registerHelper('compare', function (value1, value2, options) {
    if (value1 === value2) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo deu errado! ' + err.message);
});

// Inicialização do servidor
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Servidor ativo na porta ${PORT}`);
});


// Rota inicial
app.get("/", (req, res) => {
    res.render("index");
});

//---------------------------------------------------------------------------------------------------------------------------------

// Rota de login

// Rota de login - GET 
app.get("/login", (req, res) => {
    res.render("login");
});

// Rota de login - POST 
app.post("/login", async (req, res) => {
    const { nomeUsuario, senha } = req.body;

    try {
        const adminDoc = await db.collection('administrador').doc('admin').get();

        if (adminDoc.exists && adminDoc.data().usuario === nomeUsuario && adminDoc.data().senha === senha) {
            return res.redirect("/consultarAdmin");
        }

        const querySnapshot = await db.collection('professores')
            .where('nomeUser', '==', nomeUsuario)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
            return res.render("login", {
                errorMessage: "Usuário não encontrado."
            });
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.senha !== senha) {
            return res.render("login", {
                errorMessage: "Senha incorreta."
            });
        }

        res.redirect("/consultarProf");

    } catch (error) {
        console.error("Erro ao realizar login:", error);
        res.status(500).send("Erro ao realizar login");
    }
});

// Rota para consultar um professor
app.get("/consultarProf", async (req, res) => {
    res.render("consultarProf");
});

//---------------------------------------------------------------------------------------------------------------------------------

// Rotas relacionadas a Professores

// Rota para cadastrar um professor
app.get("/cadastrarProf", (req, res) => {
    res.render("cadastrarProf");
});

app.post("/cadastrarProf", async (req, res) => {
    try {
        await db.collection('professores').add({
            cod: req.body.cod,
            nome: req.body.nome,
            cpf: req.body.cpf,
            turma: req.body.turma,
            nomeUser: req.body.nomeUser,
            senha: req.body.senha
        });
        console.log('Adicionado com sucesso');
        res.redirect("/consultarAdmin");
    } catch (error) {
        res.status(500).send('Erro ao adicionar professor: ' + error);
    }
});

// Rota para consultar todos os professores
app.get("/consultarAdmin", async (req, res) => {
    try {
        const dataSnapshot = await db.collection('professores').get();
        const data = [];
        dataSnapshot.forEach((doc) => {
            data.push({
                id: doc.id,
                cod: doc.get('cod'),
                nome: doc.get('nome'),
                cpf: doc.get('cpf'),
                turma: doc.get('turma'),
                nomeUser: doc.get('nomeUser'),
                senha: doc.get('senha'),
            });
        });
        const isEmpty = data.length === 0;
        res.render("consultarAdmin", { data, isEmpty });
    } catch (error) {
        console.error("Erro ao consultar professores:", error);
        res.status(500).send("Erro ao consultar professores");
    }
});

// Rota para editar um professor específico
app.get("/editarProf/:id", async (req, res) => {
    try {
        const docRef = db.collection('professores').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            console.log('No such document!');
            return res.status(404).send("Documento não encontrado");
        } else {
            res.render("editarProf", { id: req.params.id, professor: doc.data() });
        }
    } catch (error) {
        console.error("Erro ao buscar documento:", error);
        res.status(500).send("Erro ao buscar documento");
    }
});

// Rota para atualizar um professor específico
app.post("/atualizarProf", async (req, res) => {
    try {
        await db.collection('professores').doc(req.body.id).update({
            cod: req.body.cod,
            nome: req.body.nome,
            cpf: req.body.cpf,
            turma: req.body.turma,
            nomeUser: req.body.nomeUser,
            senha: req.body.senha
        });
        console.log('Atualizado com sucesso');
        res.redirect("/consultarAdmin");
    } catch (error) {
        console.error('Erro ao atualizar professor:', error);
        res.status(500).send('Erro ao atualizar professor: ' + error);
    }
});

// Rota para excluir um professor específico
app.get("/excluirProf/:id", async (req, res) => {
    try {
        await db.collection('professores').doc(req.params.id).delete();
        console.log('Professor excluído com sucesso');
        res.redirect("/consultarAdmin");
    } catch (error) {
        console.error("Erro ao excluir professor:", error);
        res.status(500).send("Erro ao excluir professor: " + error);
    }
});

//------------------------------------------------------------------------------------------------------------


// Rotas relacionadas a Alunos

// Rota para cadastrar um aluno - GET
app.get("/cadastrarAluno", (req, res) => {
    res.render("cadastrarAluno");
})

// Rota para cadastrar um aluno - POST
app.post("/cadastrarAluno", async (req, res) => {
    try {

        await db.collection('alunos').add({
            registro: req.body.registro,
            nome: req.body.nome,
            dataNasc: req.body.dataNasc,
            turma: req.body.turma,
            nota1: 0.0,
            nota2: 0.0,
            nota3: 0.0,
            nota4: 0.0,
            presencas: 0,
            faltas: 0

        });

        console.log('Aluno adicionado com sucesso');
        res.redirect("/consultarAlunos");
    } catch (error) {
        res.status(500).send('Erro ao adicionar aluno: ' + error);
    }
});

// Rota para consultar todos os alunos
app.get("/consultarAlunos", async (req, res) => {
    try {
        const dataSnapshot = await db.collection('alunos').get();
        const data = [];
        dataSnapshot.forEach((doc) => {
            data.push({
                id: doc.id,
                registro: doc.get('registro'),
                nome: doc.get('nome'),
                dataNasc: doc.get('dataNasc'),
                turma: doc.get('turma'),

            });
        });
        const isEmpty = data.length === 0;
        res.render("consultarAlunos", { data, isEmpty });
    } catch (error) {
        console.error("Erro ao consultar professores:", error);
        res.status(500).send("Erro ao consultar professores");
    }
});

// Rota para editar um aluno específico
app.get("/editarAluno/:id", async (req, res) => {
    try {
        const docRef = db.collection('alunos').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            console.log('No such document!');
            return res.status(404).send("Documento não encontrado");
        } else {
            res.render("editarAluno", { id: req.params.id, alunos: doc.data() });
        }
    } catch (error) {
        console.error("Erro ao buscar documento:", error);
        res.status(500).send("Erro ao buscar documento");
    }
});

// Rota para atualizar um aluno específico
app.post("/atualizarAluno", async (req, res) => {
    try {
        const alunoRef = db.collection('alunos').doc(req.body.id);

        const updateData = {
            registro: req.body.registro,
            nome: req.body.nome,
            dataNasc: req.body.dataNasc
        };

        if (req.body.turma !== undefined) {
            updateData.turma = req.body.turma;
        }

        await alunoRef.update(updateData);

        console.log('Aluno atualizado com sucesso');
        res.redirect("/consultarAlunos");
    } catch (error) {
        console.error('Erro ao atualizar aluno:', error);
        res.status(500).send('Erro ao atualizar aluno: ' + error);
    }
});

// Rota para excluir um aluno específico
app.get("/excluirAluno/:id", async (req, res) => {
    try {
        await db.collection('alunos').doc(req.params.id).delete();
        console.log('Alunos excluído com sucesso');
        res.redirect("/consultarAlunos");
    } catch (error) {
        console.error("Erro ao excluir alunos:", error);
        res.status(500).send("Erro ao excluir professor: " + error);
    }
});

//------------------------------------------------------------------------------------------------------------------------

// Rotas relacionadas a Notas

// Rota para consultar as notas dos alunos
app.get("/consultarNotasGerais", (req, res) => {
    res.render("consultarNotasGerais");
})

// Rota para consultaras notas dos alunos
app.get("/consultarNotas", async (req, res) => {
    try {
        const dataSnapshot = await db.collection('alunos').get();
        const data = [];
        dataSnapshot.forEach((doc) => {
            data.push({
                id: doc.id,
                nome: doc.get('nome'),
                nota1: doc.get('nota1'),
                nota2: doc.get('nota2'),
                nota3: doc.get('nota3'),
                nota4: doc.get('nota4'),
            });
        });
        const isEmpty = data.length === 0;
        res.render("consultarNotasGerais", { data, isEmpty });
    } catch (error) {
        console.error("Erro ao consultar notas dos alunos:", error);
        res.status(500).send("Erro ao consultar notas dos alunos");
    }
});

// Rota para editar as notas de um aluno
app.get("/editarNotas/:id", async (req, res) => {
    try {
        const docRef = db.collection('alunos').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            console.log('Documento não encontrado');
            return res.status(404).send("Documento não encontrado");
        } else {
            res.render("editarNota", { id: req.params.id, notas: doc.data() });
        }
    } catch (error) {
        console.error("Erro ao buscar documento:", error);
        res.status(500).send("Erro ao buscar documento");
    }
});

// Rota para atualizar as notas de um aluno
app.post("/atualizarNotas", async (req, res) => {
    try {
        const docId = req.body.id;
        await db.collection('alunos').doc(docId).update({
            nota1: req.body.nota1,
            nota2: req.body.nota2,
            nota3: req.body.nota3,
            nota4: req.body.nota4,
        });
        console.log('Notas atualizadas com sucesso');
        res.redirect("/consultarNotas");
    } catch (error) {
        console.error('Erro ao atualizar notas:', error);
        res.status(500).send('Erro ao atualizar notas: ' + error.message);
    }
});


app.get("/calcularMedia/:id", async (req, res) => {
    try {
        const docRef = db.collection('alunos').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            console.log('Documento não encontrado');
            return res.status(404).send("Documento não encontrado");
        } else {
            const notas = doc.data();
            if (!notas.nota1 || !notas.nota2 || !notas.nota3 || !notas.nota4) {
                console.log('Alguma das notas está faltando');
                return res.status(400).send("Alguma das notas está faltando");
            }

            const nota1 = parseFloat(notas.nota1);
            const nota2 = parseFloat(notas.nota2);
            const nota3 = parseFloat(notas.nota3);
            const nota4 = parseFloat(notas.nota4);

            const media = (nota1 + nota2 + nota3 + nota4) / 4;
            res.send(`A média do aluno é ${media.toFixed(2)}`);
        }
    } catch (error) {
        console.error("Erro ao buscar documento:", error);
        res.status(500).send("Erro ao buscar documento");
    }
});


//------------------------------------------------------------------------------------------------------------------------

// Rotas relacionadas a Chamada

// Rota para exibir a tela de chamada diária
app.get("/chamadaDiaria", async (req, res) => {
    try {
        const alunosSnapshot = await db.collection('alunos').get();
        const alunos = [];
        alunosSnapshot.forEach((doc) => {
            alunos.push({
                id: doc.id,
                nome: doc.data().nome,
                presenca: doc.data().presenca || ""
            });
        });

        res.render("chamadaDiaria", { alunos });
    } catch (error) {
        console.error("Erro ao buscar alunos:", error);
        res.status(500).send("Erro ao buscar alunos");
    }
});

// Rota para atualizar a presença de um aluno
app.post("/atualizarPresenca", async (req, res) => {
    try {
        const { alunoId, presenca } = req.body;

        if (!alunoId || !presenca) {
            return res.status(400).send("ID do aluno e presença são obrigatórios.");
        }

        const alunoDoc = db.collection('alunos').doc(alunoId);
        const alunoData = (await alunoDoc.get()).data();

        if (!alunoData) {
            return res.status(404).send("Aluno não encontrado.");
        }

        const updateData = presenca === "Presente" ? { presencas: (alunoData.presencas || 0) + 1 } : { faltas: (alunoData.faltas || 0) + 1 };
        await alunoDoc.update(updateData);

        console.log('Presença do aluno atualizada com sucesso');
        res.status(200).send('Presença atualizada com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar presença:', error);
        res.status(500).send('Erro ao atualizar presença: ' + error.message);
    }
});

// Rota para exibir a tela de chamada geral
app.get("/chamadaGeral", async (req, res) => {
    try {
        const alunosSnapshot = await db.collection('alunos').get();
        const alunos = [];

        alunosSnapshot.forEach((doc) => {
            const alunoData = doc.data();
            const faltas = alunoData.faltas || 0;
            const faltasGreaterThanTen = faltas >= 10;
            

            alunos.push({
                id: doc.id,
                nome: alunoData.nome,
                presencas: alunoData.presencas || 0,
                faltas: faltas,
                faltasGreaterThanTen: faltasGreaterThanTen
            });
        });

        res.render("chamadaGeral", { alunos });
    } catch (error) {
        console.error("Erro ao buscar alunos:", error);
        res.status(500).send("Erro ao buscar alunos");
    }
});
