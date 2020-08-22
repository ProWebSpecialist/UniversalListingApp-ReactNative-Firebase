import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  BackHandler
} from "react-native";
import FastImage from "react-native-fast-image";
import { AppStyles } from "../AppStyles";
import { firebaseListing } from "../firebase";

const PRODUCT_ITEM_HEIGHT = 100;
const PRODUCT_ITEM_OFFSET = 5;

class CategoryScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: "Categories"
  });

  constructor(props) {
    super(props);

    this.unsubscribe = null;

    this.state = {
      loading: false,
      data: [],
      page: 1,
      seed: 1,
      error: null,
      refreshing: false
    };

    this.didFocusSubscription = props.navigation.addListener(
      "didFocus",
      payload =>
        BackHandler.addEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentDidMount() {
    this.unsubscribe = firebaseListing.subscribeListingCategories(
      this.onCollectionUpdate
    );
    this.willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      payload =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentWillUnmount() {
    this.unsubscribe();
    this.didFocusSubscription && this.didFocusSubscription.remove();
    this.willBlurSubscription && this.willBlurSubscription.remove();
  }

  onBackButtonPressAndroid = () => {
    BackHandler.exitApp();
    return true;
  };

  onCollectionUpdate = querySnapshot => {
    const data = [];
    querySnapshot.forEach(doc => {
      const { name, photo } = doc.data();
      data.push({
        id: doc.id,
        doc,
        name, // DocumentSnapshot
        photo
      });
    });

    this.setState({
      data,
      loading: false
    });
  };

  onPress = item => {
    this.props.navigation.navigate("Listing", { item: item });
  };

  renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => this.onPress(item)}>
      <View style={styles.container}>
        <FastImage style={styles.photo} source={{ uri: item.photo }} />
        <View style={styles.overlay} />
        <Text numberOfLines={3} style={styles.title}>
          {item.name || item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  render() {
    return (
      <FlatList
        style={styles.flatContainer}
        vertical
        showsVerticalScrollIndicator={false}
        data={this.state.data}
        renderItem={this.renderItem}
        keyExtractor={item => `${item.id}`}
      />
    );
  }
}

const styles = StyleSheet.create({
  flatContainer: {
    paddingLeft: 10,
    paddingRight: 10
  },
  container: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    margin: PRODUCT_ITEM_OFFSET,
    height: PRODUCT_ITEM_HEIGHT
  },
  title: {
    color: "white",
    fontSize: 17,
    fontFamily: AppStyles.fontName.bold,
    textAlign: "center"
  },
  photo: {
    height: PRODUCT_ITEM_HEIGHT,
    ...StyleSheet.absoluteFillObject
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)"
  }
});

export default CategoryScreen;
