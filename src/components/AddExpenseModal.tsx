import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Category, CATEGORIES, CATEGORY_ICONS, Expense } from '@/types/expense';
import { LiquidGlassColors, Spacing } from '@/constants/theme';
import { useExpenses } from '@/context/ExpenseContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
}

// Modal que sube desde abajo para registrar un gasto.
// Para poder agregarlo hacen falta el monto y la categoria; la descripcion es opcional.
export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  expenseToEdit = null,
}) => {
  const { addExpense, updateExpense } = useExpenses();
  // El monto es string porque asi trabaja el TextInput; se pasa a numero al guardar
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [facturaUri, setFacturaUri] = useState<string | null>(null);

  
  const pickFactura = async () => {
    Alert.alert(
      'Adjuntar comprobante',
      '¿Cómo deseas agregar tu factura?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Elegir de galería',
          onPress: () => {
            void seleccionarDeGaleria();
          },
        },
        {
          text: 'Tomar fotografía',
          onPress: () => {
            void tomarFotografia();
          },
        },
      ]
    );
  };

  const guardarImagenLocal = async (uri: string) => {
    const directory = FileSystem.documentDirectory;

    if (!directory) {
      throw new Error('No se encontró el directorio de documentos.');
    }

    const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const destination =
      `${directory}factura_${Date.now()}.${extension}`;

    await FileSystem.copyAsync({
      from: uri,
      to: destination,
    });

    return destination;
  };

  const seleccionarDeGaleria = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = await guardarImagenLocal(
          result.assets[0].uri
        );
        setFacturaUri(localUri);
      }
    } catch (error) {
      console.error('Error al seleccionar factura:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const tomarFotografia = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permiso requerido',
          'Debes permitir el acceso a la cámara para fotografiar tu factura.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = await guardarImagenLocal(
          result.assets[0].uri
        );
        setFacturaUri(localUri);
      }
    } catch (error) {
      console.error('Error al tomar fotografía:', error);
      Alert.alert('Error', 'No se pudo tomar la fotografía.');
    }
  };


  // async porque ahora hay que esperar a que el gasto se guarde en el telefono
  const handleSubmit = async () => {
    if (!amount || !category) return;
 
    try {
      const amountNumber = Number(amount);

      if (!Number.isFinite(amountNumber) || amountNumber <= 0 || !category) {
        Alert.alert('Datos inválidos', 'Ingresa un monto válido y selecciona una categoría.');
        return;
      }

      
      const handleSubmit = async () => {
        if (!amount.trim()) {
          Alert.alert('Campo obligatorio', 'Ingresa el monto del gasto.');
          return;
        }

        if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
          Alert.alert(
            'Monto inválido',
            'Ingresa un monto numérico con máximo dos decimales.'
          );
          return;
        }

        if (Number(amount) <= 0) {
          Alert.alert('Monto inválido', 'El monto debe ser mayor que cero.');
          return;
        }

        if (!category) {
          Alert.alert(
            'Categoría obligatoria',
            'Selecciona una categoría antes de guardar el gasto.'
          );
          return;
        }

        // Aquí continúa tu código actual para registrar
        // o actualizar el gasto.
      };

      if (expenseToEdit) {
        await updateExpense({
          ...expenseToEdit,
          amount: amountNumber,
          category,
          description: description.trim() || undefined,
          // Si tu formulario tiene fecha:
          date,
          // Si implementaste facturaUri:
          // facturaUri: facturaUri ?? undefined,
        });
      } else {
        await addExpense({
          amount: amountNumber,
          category,
          description: description.trim() || undefined,
          date,
          // Si implementaste facturaUri:
          // facturaUri: facturaUri ?? undefined,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error al guardar el gasto:', error);
      Alert.alert('Error', 'No se pudo guardar el gasto. Intenta de nuevo.');
    }
 
    // Reset form
    setAmount('');
    setCategory(null);
    setDescription('');
    setDate(new Date());
    setShowDatePicker(false);
    setFacturaUri(null);
    onClose();
  };


  // Igual que al guardar, se limpia el formulario para que no quede texto viejo
  const handleClose = () => {
    setAmount('');
    setCategory(null);
    setDescription('');
    setDate(new Date());
    setShowDatePicker(false);
    setFacturaUri(null);
    onClose();

  };

  useEffect(() => {
    if (!visible) return;

    if (expenseToEdit) {
      setAmount(String(expenseToEdit.amount));
      setCategory(expenseToEdit.category);
      setDescription(expenseToEdit.description ?? '');
      setDate(new Date(expenseToEdit.date));

      // Si implementaste el campo de factura:
      // setFacturaUri(expenseToEdit.facturaUri ?? null);
    } else {
      setAmount('');
      setCategory(null);
      setDescription('');
      setDate(new Date());

      // Si implementaste el campo de factura:
      // setFacturaUri(null);
    }
  }, [visible, expenseToEdit]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
        keyboardVerticalOffset={0}
      >
        {/* Tocar el fondo tambien cierra el modal */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View entering={FadeIn} style={styles.backdropBlur}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          entering={SlideInDown.springify()}
          style={styles.modalContent}
        >
          <View style={styles.modalBackground}>
            <BlurView intensity={100} tint="light" style={styles.modalBlur}>
              <View style={styles.handleBar} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                <Text style={styles.title}>
                  {expenseToEdit ? 'Editar gasto': 'Nuevo gasto'}
                </Text>

                <View style={styles.inputSection}>
                  <Text style={styles.label}>Monto (USD)</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={(text) => {
                        // Permite números y hasta dos decimales.
                        const validFormat = /^\d*\.?\d{0,2}$/;

                        if (validFormat.test(text)) {
                          setAmount(text);
                        }
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={LiquidGlassColors.glassTextSecondary}
                      maxLength={12}
                    />
                  </View>
                </View>
                
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Fecha del gasto *</Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dateButtonText}>
                      📅 {date.toLocaleDateString('es-EC', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS !== 'ios') {
                          setShowDatePicker(false);
                        }

                        if (selectedDate) {
                          setDate(selectedDate);
                        }
                      }}
                    />
                  )}

                  {Platform.OS === 'ios' && showDatePicker && (
                    <TouchableOpacity
                      style={styles.cancelDateButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.dateButtonText}>Aceptar fecha</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.label}>Categoría</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesScroll}
                    contentContainerStyle={styles.categoriesContent}
                  >
                    {/* La elegida se pinta con el gradiente */}
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={[
                          styles.categoryButton,
                          category === cat && styles.categoryButtonActive,
                        ]}
                      >
                        {category === cat ? (
                          <LinearGradient
                            colors={[
                              LiquidGlassColors.primary,
                              LiquidGlassColors.secondary,
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.categoryGradient}
                          >
                            <Text style={styles.categoryIcon}>
                              {CATEGORY_ICONS[cat]}
                            </Text>
                            <Text style={styles.categoryTextActive}>{cat}</Text>
                          </LinearGradient>
                        ) : (
                          <>
                            <Text style={styles.categoryIcon}>
                              {CATEGORY_ICONS[cat]}
                            </Text>
                            <Text style={styles.categoryText}>{cat}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.label}>Descripción (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Ej: Almuerzo, transporte a la universidad..."
                    placeholderTextColor={LiquidGlassColors.glassTextSecondary}
                    multiline
                  />
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.label}>
                    Factura o comprobante (opcional)
                  </Text>

                  <TouchableOpacity
                    style={styles.facturaButton}
                    onPress={pickFactura}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.facturaButtonText}>
                      📎 {facturaUri
                        ? 'Cambiar comprobante'
                        : 'Adjuntar imagen o tomar foto'}
                    </Text>
                  </TouchableOpacity>

                  {facturaUri && (
                    <View style={styles.facturaPreviewContainer}>
                      <Image
                        source={{ uri: facturaUri }}
                        style={styles.facturaPreview}
                        resizeMode="contain"
                      />

                      <TouchableOpacity
                        onPress={() => setFacturaUri(null)}
                        style={styles.removeFacturaButton}
                      >
                        <Text style={styles.removeFacturaText}>
                          Quitar comprobante
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!amount || !category) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!amount || !category}
                  >
                    <LinearGradient
                      colors={[LiquidGlassColors.primary, LiquidGlassColors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.submitGradient}
                    >
                      <Text style={styles.submitButtonText}>
                        {expenseToEdit ? 'Guardar Cambios' : 'Agregar gasto'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </BlurView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropBlur: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalBackground: {
    // Bajito a proposito: si es casi opaco no se ve el blur del fondo
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  modalBlur: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: Spacing.four,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: LiquidGlassColors.glassTextSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
    opacity: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LiquidGlassColors.glassText,
    marginBottom: Spacing.four,
  },
  inputSection: {
    marginBottom: Spacing.four,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
    marginBottom: Spacing.two,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingHorizontal: Spacing.three,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LiquidGlassColors.primary,
    marginRight: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: LiquidGlassColors.glassText,
    paddingVertical: Spacing.three,
  },
  descriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingHorizontal: Spacing.three,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoriesScroll: {
    marginHorizontal: -Spacing.two,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  categoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    padding: Spacing.two,
    minWidth: 100,
    alignItems: 'center',
  },
  categoryButtonActive: {
    borderColor: 'transparent',
  },
  categoryGradient: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    width: '100%',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: Spacing.one,
  },
  categoryText: {
    fontSize: 12,
    color: LiquidGlassColors.glassText,
    textAlign: 'center',
  },
  categoryTextActive: {
    fontSize: 12,
    color: LiquidGlassColors.glassTextLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: LiquidGlassColors.glassText,
  },
  submitButton: {
    flex: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LiquidGlassColors.glassTextLight,
  },
  
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    padding: Spacing.three,
  },

  dateButtonText: {
    fontSize: 15,
    color: LiquidGlassColors.glassText,
  },

  cancelDateButton: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },

  facturaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: LiquidGlassColors.glassBorder,
    borderStyle: 'dashed',
    padding: Spacing.three,
    alignItems: 'center',
  },

  facturaButtonText: {
    color: LiquidGlassColors.glassText,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  facturaPreviewContainer: {
    marginTop: Spacing.two,
    alignItems: 'center',
  },

  facturaPreview: {
    width: '100%',
    height: 180,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  removeFacturaButton: {
    marginTop: Spacing.two,
    padding: Spacing.two,
  },

  removeFacturaText: {
    color: LiquidGlassColors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },

});
