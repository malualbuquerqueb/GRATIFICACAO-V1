# Backend do SGGD (Django)

Monólito modular: cada componente do *00_Plano de desenvolvimento de histórias-componentes* é um app Django
com suas tabelas no mesmo banco (SQLite em desenvolvimento, PostgreSQL via `.env`).

| App | Componente | Situação |
|---|---|---|
| `cadastro` | Cadastro de Avaliados e Unidades | implementado |
| `auditoria` | Registro de Auditoria | base mínima (modelo + `registrar()` + listagem), para o responsável evoluir |
| `acesso`, `normativa`, `coleta`, `apuracao`, `recurso`, `publicacao`, `pagamento` | demais componentes | a fazer |

## Rodar

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py importar_cadastro      # carrega os mesmos dados do src/data/mockData.ts
python manage.py test                   # testes
python manage.py runserver              # http://127.0.0.1:8000
```

Depois, em outro terminal, na raiz do repositório: `npm run dev`. O Vite encaminha `/api` para o Django.
Com o backend desligado o front continua funcionando com o `mockData.ts`.

## Componente `cadastro`

O que o plano pede e onde está:

| Plano | Implementação |
|---|---|
| Define classes Avaliado e Unidade | `cadastro/models.py` (+ Distrito). Campos iguais aos tipos `Usuario`, `Unidade` e `Distrito` do front |
| Cadastra avaliados e unidades por JSON/https | `POST /api/cadastro/importar/` e `python manage.py importar_cadastro arquivo.json` (tudo ou nada) |
| Exibe vínculo unidade-pessoa para apuração | `GET /api/vinculos/?unidadeId=&distritoId=` e `services.vinculos_unidade_pessoa()` |
| É registrado em auditoria | toda criação/alteração chama `auditoria.services.registrar()` (operações "Unidade cadastrada", "Vínculo alterado"...) |

Regras (as mesmas do `src/utils/escopo.ts`):
- **Gestor de Unidade** precisa de unidade; o distrito é o da unidade.
- **Coordenador Distrital** é vinculado a um distrito, sem unidade.
- **SEAB/CAM** e **Configurador** têm visão municipal: sem unidade nem distrito.
- Ninguém é apagado: só **inativado**. Unidade com pessoas ativas não pode ser inativada.
- Ids no padrão do protótipo (`d1`, `u5`, `us10`) para casar com os registros que ainda estão no mock.

### API

| Método | Rota | |
|---|---|---|
| GET | `/api/distritos/` | |
| GET / POST | `/api/unidades/` | filtros `distritoId`, `tipo`, `status` |
| GET / PATCH | `/api/unidades/{id}/` | sem DELETE |
| POST | `/api/unidades/{id}/inativar/` · `/reativar/` | |
| GET | `/api/unidades/{id}/vinculos/` | avaliados da unidade |
| GET / POST | `/api/usuarios/` | filtros `perfilId`, `status`, `distritoId`, `unidadeId` |
| GET / PATCH | `/api/usuarios/{id}/` | |
| POST | `/api/usuarios/{id}/inativar/` · `/reativar/` | |
| GET | `/api/vinculos/` | vínculo unidade-pessoa dos avaliados ativos (gestores e coordenadores) |
| POST | `/api/cadastro/importar/` | `{"distritos": [], "unidades": [], "usuarios": []}` |
| GET | `/api/auditoria/?componente=cadastro` | formato `AuditoriaEntrada` do front |

**Permissão provisória:** leitura é livre; escrita só com perfil `seab` ou `configurador`. Como o protótipo ainda
não tem login, o front manda o perfil do seletor no cabeçalho `X-Perfil` (e o nome em `X-Usuario`).
Quando o componente de Controle de Acesso existir, ele substitui `sggd/permissoes.py`.

### Premissas a validar com a CAM
- Lista de tipos de unidade (hoje: USF, UBT, UPA, Policlínica, CAPS, Outro).
- Fonte oficial para a carga real das unidades e avaliados.
