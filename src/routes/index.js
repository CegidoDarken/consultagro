const express = require('express');
const { parse } = require('path')
const { Server } = require('socket.io');
const router = express.Router();
const XLSX = require('xlsx');
const fs = require('fs-extra');
const mime = require('mime-types');
const { SerialPort } = require('serialport');
const uuid = require('uuid');
let port;
let io;
let tag = "";
let isConnected = false;
const { connection } = require('../database');
function configureSocket(server) {
  io = new Server(server);
  io.setMaxListeners(0);
  io.on("connection", (socket) => {
    socket.on('estado:data', (data) => {
      port.write(data);
    });
  });
}
connection.connect((err) => {
  console.log("Connecting to the database...".yellow);
  if (err) {
    console.log(`Database: ${connection.state.red}`);
    console.log(`ERROR: ${err.message}`.red);
  } else {
    console.log(`Database: ${connection.state.green}`);
    console.log(`Connected to ${connection.config.database}`.yellow);
  };
});

const productos = [
  { nombre: 'Leche', rfid: '19948651' },
  { nombre: 'Pan', rfid: '1161396929' },
];

router.get("/administrador", async (req, res) => {
  res.render("administrador");
});

router.get("/pedidos", async (req, res) => {
  res.render("pedidos");
});
router.get("/analisis", async (req, res) => {
  res.render("analisis");
});
router.get("/registrarproductos", async (req, res) => {


  const arduinoUnoVendorIds = ['2341', '2A03'];
  SerialPort.list()
    .then((result) => {
      const connectedArduinoUno = result.find((port) => arduinoUnoVendorIds.includes(port.vendorId));
      if (connectedArduinoUno && !isConnected) {
        port = new SerialPort({
          path: connectedArduinoUno.path,
          baudRate: 9600
        });
        port.on('error', function (err) {
          io.emit('estado:data', {
            estado: "Desconectado"
          });
          console.log('Error:', err.message);
        });

        port.on('open', () => {
          io.emit('estado:data', {
            estado: "Conectado"
          });
          console.log('Conectado');
          isConnected = true;
          port.on('data',async (data) => {
            if (!data.toString().includes('\n')) {
              tag += data.toString();
            } else {
              tag += data.toString();
              let productoEncontrado = await buscarProducto(tag.trim());
              if (productoEncontrado) {
                io.emit('arduino:data', {
                  codigo: productoEncontrado.codigo,
                  categoria: productoEncontrado.categoria,
                  nombre: productoEncontrado.nombre,
                  descripcion: productoEncontrado.descripcion,
                  precio: productoEncontrado.precio,
                  imagen:productoEncontrado.imagen
                });
              } else {
                io.emit('arduino:data', {
                  value: "Producto no reconocido"
                });

              }
              tag = "";
            }
          });
        });
        port.on('close', () => {
          io.emit('estado:data', {
            estado: "Desconectado"
          });
          console.log('Desconectado');
          isConnected = false;
        });
      }
    })
    .catch((err) => {
      console.error(err);
    });
  res.render("registrarproductos", { isConnected });
});

async function buscarProducto(tag) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM productos,categorias WHERE productos.categoria_id= categorias.id_categoria AND tag = ?";
    connection.query(sql, [tag], (error, results) => {
      if (error) {
        reject(error);
      } else {
        if (results.length > 0) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      }
    });
  });
}
/*router.get("/cerrarpuertos", async (req, res) => {
  // Código para cerrar los puertos y liberar los recursos
  if (port) {
    port.close(); // Cerrar el puerto serial
    port = null; // Restablecer la variable port a null
  }
  res.send("Puertos cerrados");
});*/

router.get("/", async (req, res) => {
  res.render("index");
});
router.get("/panel", async (req, res) => {
  res.render("panel");
});
router.get("/kardex", async (req, res) => {
  res.render("kardex");
});
router.get("/pedido", async (req, res) => {
  res.render("pedido");
});
router.get("/importarexcel", async (req, res) => {
  res.render("importarexcel", { data: null, clientes: null, productos: null, fileStats: null });
});
function generarYGuardarCodigosRFID(cantidad) {
  const codigosRFID = [];
  for (let i = 0; i < cantidad; i++) {
    const codigoRFID = uuid.v4;
    codigosRFID.push(codigoRFID);
  }
  return codigosRFID;
}
router.post('/importarexcel', async (req, res) => {
  const rfidCode = uuid.v4().replace(/-/g, '').substring(0, 16);

  // Mostrar el código generado
  console.log('Código RFID generado:', rfidCode);
  try {
    const file = req.files.file;// Accede al archivo cargado desde la solicitud
    const cantidadCodigosRFID = 16; // Cambia esto por la cantidad deseada
    const codigosRFIDGenerados = generarYGuardarCodigosRFID(cantidadCodigosRFID);
    console.log('Códigos RFID generados:', codigosRFIDGenerados);
    codigosRFIDGenerados.forEach(element => {
      console.log(element.name);
    });
    const fileStats = {
      name: file.name.substring(0, file.name.lastIndexOf('.')),
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
      type: mime.extension(file.mimetype)
    };
    // Mueve el archivo a una ubicación temporal en el servidor
    await fs.ensureDir('uploads');
    await file.mv('uploads/' + file.name);
    const startTime = Date.now();
    // Procesa el archivo Excel
    const workbook = XLSX.readFile('uploads/' + file.name);
    const sheetName = workbook.SheetNames[1];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 2 });

    let facturas = new Array();
    let productos = new Array();
    let clientes = new Array();
    jsonData.forEach(function (data) {
      const values = Object.values(data);
      if (values[1] != "-") {
        facturas.push({
          nombre: values[1],
          direccion: values[2],
          identificacion: values[3],
          telefono: values[4]
        });
      }
    });

    // Itera sobre los datos y crea una fila por cada elemento
    jsonData.forEach(function (data) {
      const values = Object.values(data);
      if (values[1] != "-") {
        clientes.push({
          nombre: values[1],
          direccion: values[2],
          identificacion: values[3],
          telefono: values[4]
        });
      }
      if (values[7] != "-") {
        productos.push({
          codigo: values[7],
          descripcion: values[8],
          medida: values[9],
          precio: values[10],
        });
      }
      if (values[13] != "-") {
        productos.push({
          codigo: values[13],
          descripcion: values[14],
          medida: values[15],
          precio: values[16],
        });
      }
      if (values[19] != "-") {
        productos.push({
          codigo: values[19],
          descripcion: values[20],
          medida: values[21],
          precio: values[22],
        });
      }
      if (values[25] != "-") {
        productos.push({
          codigo: values[25],
          descripcion: values[26],
          medida: values[27],
          precio: values[28],
        });
      }
      if (values[31] != "-") {
        productos.push({
          codigo: values[31],
          descripcion: values[32],
          medida: values[33],
          precio: values[34],
        });
      }
    });

    const dataClientes = new Set();
    clientes.forEach(cliente => {
      if (!dataClientes.has(cliente.nombre)) {
        dataClientes.add(cliente.nombre);
      }
    });
    clientes = Array.from(dataClientes).map(nombre => clientes.find(cliente => cliente.nombre === nombre));
    const dataProductos = new Set();
    productos.forEach(producto => {
      if (!dataProductos.has(producto.codigo)) {
        dataProductos.add(producto.codigo);
      }
    });
    productos = Array.from(dataProductos).map(codigo => productos.find(producto => producto.codigo === codigo));
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    const elapsedSeconds = Math.round(elapsedTime / 1000).toFixed(2);
    //console.log("Clientes", clientes);
    //console.log("Productos", productos);
    const insertQuery = 'INSERT INTO `productos`(`codigo`, `tag`, `id_categoria`, `descripcion`, `medida`, `precio`, `imagen`) VALUES (?, ?, ?, ?, ?, ?, ?)';
    /*productos.forEach((producto) => {
      const {codigo, descripcion, medida, precio } = producto;
      connection.query(insertQuery, [codigo, null, null, descripcion, medida, precio, null], (error, results) => {
        if (error) {
          console.error('Error al insertar el producto:', error);
        } else {
          console.log('Producto insertado:', results);
        }
      });
    });*/
    console.log(fileStats);
    console.log("Tiempo estimado de importación: " + elapsedSeconds + " segundos");
    // Elimina el archivo temporal
    await fs.remove('uploads/' + file.name);
    res.render('importarexcel', { data: jsonData || null, clientes: clientes || null, productos: productos || null, fileStats: fileStats || null });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = { router, configureSocket };
