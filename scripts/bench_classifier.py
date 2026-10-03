# Timing only: random weights (pretrained download is blocked here); speed is identical.
import time, os, numpy as np, tensorflow as tf
tf.get_logger().setLevel("ERROR")
N_CLASSES=7
base=tf.keras.applications.MobileNetV3Small(input_shape=(224,224,3),include_top=False,weights=None,pooling="avg")
x=np.random.rand(64,224,224,3).astype("float32")*255
base.predict(x,verbose=0)
t=time.time(); 
for _ in range(5): base.predict(x,verbose=0)
fe=320/(time.time()-t); print(f"1) frozen-backbone feature extraction: {fe:.0f} img/s -> 20k images in {20000/fe/60:.1f} min")
model=tf.keras.Sequential([base,tf.keras.layers.Dense(N_CLASSES,activation="softmax")])
model.compile("adam","sparse_categorical_crossentropy")
y=np.random.randint(0,N_CLASSES,64)
model.train_on_batch(x,y); t=time.time()
for _ in range(5): model.train_on_batch(x,y)
ft=320/(time.time()-t); print(f"2) full fine-tune: {ft:.0f} img/s -> 1 epoch of 20k in {20000/ft/60:.1f} min")
conv=tf.lite.TFLiteConverter.from_keras_model(model); conv.optimizations=[tf.lite.Optimize.DEFAULT]
open("m.tflite","wb").write(conv.convert()); print(f"3) TFLite int8-weight model size: {os.path.getsize('m.tflite')/1e6:.2f} MB")
it=tf.lite.Interpreter("m.tflite"); it.allocate_tensors(); i=it.get_input_details()[0]
it.set_tensor(i["index"],x[:1]); it.invoke(); t=time.time()
for _ in range(50): it.set_tensor(i["index"],x[:1]); it.invoke()
print(f"4) single-image inference (TFLite, this CPU, 1 image): {(time.time()-t)/50*1000:.0f} ms")
