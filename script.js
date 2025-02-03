import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";

// Importa as funções necessárias do Firestore para interagir com o banco de dados
import {
  getFirestore,   // Obtém uma instância do Firestore (banco de dados NoSQL)
  addDoc,         // Adiciona um novo documento em uma coleção
  collection,     // Obtém uma referência a uma coleção no Firestore
  getDocs,        // Obtém todos os documentos de uma coleção
  deleteDoc,      // Exclui um documento específico
  doc,           // Obtém a referência de um documento no Firestore
  getDoc,        // Obtém um documento específico pelo ID
  updateDoc      // Atualiza um documento existente no Firestore
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOGc6QaDsb3_1vhzrOieaePH5REdP4hQA", // Chave de API para autenticar o acesso ao Firebase
  authDomain: "crudfirestore-f44b4.firebaseapp.com", // Domínio de autenticação do Firebase
  projectId: "crudfirestore-f44b4", // ID do projeto no Firebase
  storageBucket: "crudfirestore-f44b4.firebasestorage.app", // URL do armazenamento de arquivos no Firebase
  messagingSenderId: "302268959430", // ID do remetente usado para notificações push
  appId: "1:302268959430:web:08cb825e36782b733065c7" // ID do aplicativo no Firebase
};

// Inicizlização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referências aos elementos da página
const notify = document.querySelector('.notify');
const addBtn = document.querySelector('#add_Data');
const updateDataBtn = document.querySelector('#update_data');
const categoryTables = document.querySelector('#categoryTables');
const cartItems = document.querySelector('#cartItems');
const cartTotal = document.querySelector('#cartTotal');
const finalizeSaleBtn = document.querySelector('#finalizeSale');
let cart = [];

// Esconde o botão de atualizar por padrão
updateDataBtn.classList.add('hide');

// Notificação para cadastro (Se deu certo ou errado)
function showNotification(message, isError = false) {
  notify.innerHTML = message;
  notify.classList.toggle('error', isError);
  notify.style.display = 'block';
  setTimeout(() => notify.style.display = 'none', 3000);
}

// Atualização do botão cadastro de produto e o de atualizar
function toggleUpdateMode(showUpdate = false) {
  if (showUpdate) {
    updateDataBtn.classList.remove('hide');
    addBtn.classList.add('hide');
  } else {
    updateDataBtn.classList.add('hide');
    addBtn.classList.remove('hide');
  }
}

// Função para resetar o formulário de cadastro de produto sempre que cadastrar ou atualizar
function resetForm() {
  document.querySelector('#productName').value = "";
  document.querySelector('#price').value = "";
  document.querySelector('#quantity').value = "";
  document.querySelector('#category').value = "";
  toggleUpdateMode(false);
}

// Função para adicionar o produto no Firestore
async function addData() {
  // valores do formulário
  const productName = document.querySelector('#productName').value;
  const price = parseFloat(document.querySelector('#price').value);
  const quantity = parseInt(document.querySelector('#quantity').value, 10);
  const category = document.querySelector('#category').value;

  // Ve se todos os campos foram preenchidos
  if (!productName || isNaN(price) || isNaN(quantity) || !category) {
    showNotification("Por favor, preencha todos os campos!", true);
    return;
  }

  // Add um novo documento à coleção "products"
  try {
    await addDoc(collection(db, "products"), {
      productName,
      price,
      quantity,
      category
    });
    showNotification("Produto adicionado com sucesso!");
    resetForm();
    getData();
  } catch (error) {
    console.log(error);
    showNotification("Erro ao adicionar o produto!", true);
  }
}

// Função para buscar os produtos no Firesatore e exibir na tela/tabela
async function getData() {
  try {
    //obtem os produtos da coleção
    const querySnapshot = await getDocs(collection(db, "products"));
    const categories = ["Caneta", "Papel", "Caderno", "Impressora", "Acessórios"];
    const categoryData = {}; //Armazerar os produtoes organizados por categorias

    // Inicializa categorias vazias
    categories.forEach(cat => {
      categoryData[cat] = [];
    });

    // Organiza os produtos dentro das categorias
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (categories.includes(data.category)) {
        categoryData[data.category].push({ id: doc.id, ...data });
      }
    });

    // Limpa o conteúdo antes de preencher novamente
    categoryTables.innerHTML = "";

    // Obtém os templates
    const categoryTemplate = document.querySelector('#category-template');
    const productTemplate = document.querySelector('#product-template');

    // Percorre as categorias e preenche os produtos
    for (const [category, products] of Object.entries(categoryData)) {
      if (products.length === 0) continue; // Não exibe categorias vazias

      // Clona o template de categoria
      const categoryClone = categoryTemplate.content.cloneNode(true);
      categoryClone.querySelector('.category-name').textContent = category;

      // Obtém o corpo da tabela da categoria
      const categoryBody = categoryClone.querySelector('.category-body');

      // Adiciona os produtos dentro da categoria
      products.forEach(product => {
        const productClone = productTemplate.content.cloneNode(true);

        productClone.querySelector('.product-id').textContent = product.id;
        productClone.querySelector('.product-name').textContent = product.productName;
        productClone.querySelector('.product-price').textContent = `R$ ${product.price.toFixed(2)}`;
        productClone.querySelector('.product-quantity').textContent = product.quantity;

        // Adiciona eventos aos botões
        const deleteBtn = productClone.querySelector('.del_btn');
        deleteBtn.addEventListener("click", () => deleteProduct(product.id));

        const updateBtn = productClone.querySelector('.up_btn');
        updateBtn.addEventListener("click", () => updateData(product.id));

        const sellBtn = productClone.querySelector('.sell_btn');
        sellBtn.addEventListener("click", () => addToCart(product.id, product.productName, product.price, product.quantity));

        // Adiciona o produto na tabela da categoria
        categoryBody.appendChild(productClone);
      });

      // Adiciona a categoria completa na tabela principal
      categoryTables.appendChild(categoryClone);
    }
  } catch (error) {
    console.error(error);
    showNotification("Erro ao carregar os produtos!", true);
  }
}

// Deletar os produtos do documento Firestore
window.deleteProduct = async function (id) {
  try {
    await deleteDoc(doc(db, "products", id));
    showNotification("Produto excluído com sucesso!");
    getData();
  } catch (error) {
    console.log(error);
    showNotification("Erro ao excluir o produto!", true);
  }
};

// Atualziar os produtos no Firestore
window.updateData = async function (id) {
  try {
    const docSnapshot = await getDoc(doc(db, "products", id));
    const currentData = docSnapshot.data(); // Pega os dados atuais do documento
    //Preenche os campos do formulário para atualizar o produto selecionado
    document.querySelector('#productName').value = currentData.productName;
    document.querySelector('#price').value = currentData.price;
    document.querySelector('#quantity').value = currentData.quantity;
    document.querySelector('#category').value = currentData.category;

    toggleUpdateMode(true); // Bottão de atualizar aparece

    updateDataBtn.addEventListener('click', async function handleUpdate() {
      // Obtém os novos valores preenchidos
      const newProductName = document.querySelector('#productName').value;
      const newPrice = parseFloat(document.querySelector('#price').value);
      const newQuantity = parseInt(document.querySelector('#quantity').value, 10);
      const newCategory = document.querySelector('#category').value;

      if (!newProductName || isNaN(newPrice) || isNaN(newQuantity) || !newCategory) {
        showNotification("Por favor, preencha todos os campos!", true);
        return;
      }

      // Atualiza no Firestore
      await updateDoc(doc(db, "products", id), {
        productName: newProductName,
        price: newPrice,
        quantity: newQuantity,
        category: newCategory
      });

      showNotification("Produto atualizado com sucesso!");
      resetForm();
      updateDataBtn.removeEventListener('click', handleUpdate);
      getData();
    });
  } catch (error) {
    console.log(error);
    showNotification("Erro ao atualizar o produto!", true);
  }
};

// Função para registrar uma venda no Firestore
async function registerSale(productName, price, quantity, totalPrice) {
  try {
    // add um novo na coeção vendas
    await addDoc(collection(db, "vendas"), {
      productName: productName,
      price: price,
      quantity: quantity,
      totalPrice: totalPrice,
      date: new Date().toISOString() // Registra a data e hora da venda
    });

    showNotification("Venda registrada com sucesso!");
  } catch (error) {
    showNotification("Erro ao registrar a venda!", true);
  }
};


window.addToCart = function (id, productName, price, availableQuantity) {
  const existingItem = cart.find(item => item.id === id); // verifica se o produto já esta no carrinho

  //se existir aumenta a quantidade e não duplica
  if (existingItem) {
    existingItem.quantity++;
  } else {
    // Se o produto não estiver no carrinho, adiciona um novo item com quantidade 1
    cart.push({ id, productName, price, quantity: 1, availableQuantity });
  }

  renderCart();
};

//Função para mostrar o carrinho
function renderCart() {
  const cartTableBody = document.querySelector('#cartItems');
  const cartTotalElement = document.querySelector('#cartTotal');
  const cartItemTemplate = document.querySelector('#cart-item-template');

  // Limpa o carrinho antes de adicionar os novos itens
  cartTableBody.innerHTML = "";
  let total = 0;

  // Calculo para fazer o preço
  cart.forEach(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    // Clona o template do item do carrinho
    const cartItemClone = cartItemTemplate.content.cloneNode(true);

    // preenchendo os dados do item
    cartItemClone.querySelector('.cart-product-name').textContent = item.productName;
    cartItemClone.querySelector('.cart-product-price').textContent = `R$ ${item.price.toFixed(2)}`;

    // Configura o campo de entrada de quantidade para fazer alteração
    const quantityInput = cartItemClone.querySelector('.cart-product-quantity');
    quantityInput.value = item.quantity;
    quantityInput.min = 1;
    quantityInput.max = item.availableQuantity;
    quantityInput.addEventListener("change", () => updateCartQuantity(item.id, quantityInput.value));

    // preendhe o valor total
    cartItemClone.querySelector('.cart-product-subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;

    // Botão de remover item do carrinho
    const removeBtn = cartItemClone.querySelector('.remove-cart-item');
    removeBtn.addEventListener("click", () => removeFromCart(item.id));

    // Adiciona o item clonado à tabela do carrinho
    cartTableBody.appendChild(cartItemClone);
  });

  // Atualiza o total do carrinho
  cartTotalElement.textContent = total.toFixed(2);
  finalizeSaleBtn.disabled = cart.length === 0;
}

// Remover item do carro
function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  renderCart();
}

// Proucura no carrinho um produto com o id requerido
window.updateCartQuantity = function (id, newQuantity) {
  const item = cart.find(product => product.id === id);
  newQuantity = parseInt(newQuantity, 10); // Coonvertendo para int

  //Se item estiver no carrinho e a quantidade for valida, atualiza o quantidade do produto
  if (item && newQuantity > 0 && newQuantity <= item.availableQuantity) {
    item.quantity = newQuantity;
    renderCart();
  }
};

// Atualiza a função finalizeSale() para calcular e registrar o total da venda
async function finalizeSale() {
  if (cart.length === 0) {
    alert("O carrinho está vazio!");
    return;
  }

  try {
    let totalSaleAmount = 0; // Variável para armazenar o valor total da venda

    for (const item of cart) {
      const totalItemPrice = item.price * item.quantity;
      totalSaleAmount += totalItemPrice;

      // Registra a venda na coleção "vendas"
      await registerSale(item.productName, item.price, item.quantity, totalItemPrice);

      // Atualiza a quantidade no Firestore
      const productRef = doc(db, "products", item.id);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const newQuantity = productSnap.data().quantity - item.quantity;

        if (newQuantity < 0) {
          alert(`Estoque insuficiente para o produto: ${item.productName}`);
          return;
        }

        await updateDoc(productRef, { quantity: newQuantity });
      }
    }

    cart = [];
    renderCart();
    getData();

    showNotification(`Venda finalizada! Total: R$ ${totalSaleAmount.toFixed(2)}`);

  } catch (error) {
    showNotification("Erro ao finalizar a venda!", true);
  }
}

// Associa o botão de finalizar venda à função
finalizeSaleBtn.addEventListener('click', finalizeSale);

addBtn.addEventListener('click', addData);

getData();

// Protetor de tela
document.getElementById("screenSaver").onclick = function() {
  this.style.display = 'none';
};

// Referências aos elementos da página
const clientNameInput = document.querySelector('#clientName');
const clientEmailInput = document.querySelector('#clientEmail');
const clientPhoneInput = document.querySelector('#clientPhone');
const clientCPFInput = document.querySelector('#clientCPF');
const addClientBtn = document.querySelector('#addClientBtn');
const updateClientBtn = document.querySelector('#updateClientBtn');
const clientList = document.querySelector('#clientList');
const clientTemplate = document.querySelector('#client-template');

let editingClientId = null; // ID do cliente que está sendo editado

//  validar CPF (Formato XXX.XXX.XXX-XX)
function isValidCPF(cpf) {
  return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
}

// 📌 Função para cadastrar um novo cliente no Firestore
async function addClient() {
  const name = clientNameInput.value.trim();
  const email = clientEmailInput.value.trim();
  const phone = clientPhoneInput.value.trim();
  const cpf = clientCPFInput.value.trim();

  if (!name || !email || !phone || !cpf) {
    showNotification("Preencha todos os campos!", true);
    return;
  }

  if (!isValidCPF(cpf)) {
    showNotification("CPF inválido! Use o formato XXX.XXX.XXX-XX", true);
    return;
  }

  // Adicionando o cliente no Firebase
  try {
    await addDoc(collection(db, "clientes"), {
      name: name,
      email: email,
      phone: phone,
      cpf: cpf
    });

    showNotification("Cliente cadastrado com sucesso!");
    resetClientForm();
    loadClients();
  } catch (error) {
    showNotification("Erro ao cadastrar o cliente!", true);
  }
}

// 📌 Função para carregar clientes do Firestore
async function loadClients() {
  try {
    const querySnapshot = await getDocs(collection(db, "clientes"));
    clientList.innerHTML = ""; // Limpa a tabela antes de atualizar

    querySnapshot.forEach(doc => {
      const client = doc.data();
      const clientClone = clientTemplate.content.cloneNode(true);

      clientClone.querySelector('.client-id').textContent = doc.id;
      clientClone.querySelector('.client-name').textContent = client.name;
      clientClone.querySelector('.client-email').textContent = client.email;
      clientClone.querySelector('.client-phone').textContent = client.phone;
      clientClone.querySelector('.client-cpf').textContent = client.cpf;

      // Botão de editar
      const editBtn = clientClone.querySelector('.edit-client');
      editBtn.addEventListener("click", () => loadClientForEdit(doc.id, client));

      // Botão de excluir
      const deleteBtn = clientClone.querySelector('.delete-client');
      deleteBtn.addEventListener("click", () => deleteClient(doc.id));

      clientList.appendChild(clientClone);
    });
  } catch (error) {
    showNotification("Erro ao carregar os clientes!", true);
  }
}

// 📌 Função para carregar dados do cliente para edição
function loadClientForEdit(clientId, clientData) {
  clientNameInput.value = clientData.name;
  clientEmailInput.value = clientData.email;
  clientPhoneInput.value = clientData.phone;
  clientCPFInput.value = clientData.cpf;

  editingClientId = clientId;
  addClientBtn.classList.add("hide");
  updateClientBtn.classList.remove("hide");
}

// 📌 Função para atualizar um cliente no Firestore
async function updateClient() {
  if (!editingClientId) return;

  const name = clientNameInput.value.trim();
  const email = clientEmailInput.value.trim();
  const phone = clientPhoneInput.value.trim();
  const cpf = clientCPFInput.value.trim();

  if (!name || !email || !phone || !cpf) {
    showNotification("Preencha todos os campos!", true);
    return;
  }

  if (!isValidCPF(cpf)) {
    showNotification("CPF inválido! Use o formato XXX.XXX.XXX-XX", true);
    return;
  }

  try {
    await updateDoc(doc(db, "clientes", editingClientId), {
      name: name,
      email: email,
      phone: phone,
      cpf: cpf
    });

    showNotification("Cliente atualizado com sucesso!");
    resetClientForm();
    loadClients();
  } catch (error) {
    showNotification("Erro ao atualizar o cliente!", true);
  }
}

// 📌 Função para excluir um cliente do Firestore
async function deleteClient(clientId) {
  try {
    await deleteDoc(doc(db, "clientes", clientId));
    showNotification("Cliente excluído!");
    loadClients();
  } catch (error) {
    showNotification("Erro ao excluir o cliente!", true);
  }
}

// 📌 Função para limpar o formulário e restaurar os botões
function resetClientForm() {
  clientNameInput.value = "";
  clientEmailInput.value = "";
  clientPhoneInput.value = "";
  clientCPFInput.value = "";
  editingClientId = null;

  addClientBtn.classList.remove("hide");
  updateClientBtn.classList.add("hide");
}

// Eventos dos botões
addClientBtn.addEventListener("click", addClient);
updateClientBtn.addEventListener("click", updateClient);

// Carregar os clientes ao iniciar
loadClients();


